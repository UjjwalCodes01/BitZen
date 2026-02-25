/**
 * ZKProof Plugin - Real Groth16 Garaga Integration
 *
 * Calls the backend /api/v1/plugins/zkproof/* endpoints which run
 * a real snarkjs Groth16 prover over the agent_identity.circom circuit
 * and produce Garaga calldata for on-chain BN254 pairing verification.
 */

import {
  Plugin,
  PluginConfig,
  AgentContext,
  PluginAction,
  ActionResult,
  ZKProof
} from '../types';

export interface ZKProofPluginConfig {
  verifierType: 's2' | 'garaga';
  proofExpiration: number; // seconds
  backendUrl?: string;
}

export class ZKProofPlugin implements Plugin {
  name = 'zkproof';
  version = '1.0.0';
  description = 'ZK proof generation and verification using Garaga';
  
  private config!: ZKProofPluginConfig;
  private context!: AgentContext;
  private initialized = false;

  actions: PluginAction[] = [
    {
      name: 'generateProof',
      description: 'Generate ZK proof for agent identity verification',
      parameters: [
        {
          name: 'agentAddress',
          type: 'string',
          required: true,
          description: 'Agent Starknet address'
        },
        {
          name: 'message',
          type: 'string',
          required: false,
          description: 'Optional message to include in proof'
        }
      ],
      execute: this.generateProof.bind(this)
    },
    {
      name: 'verifyProof',
      description: 'Verify a ZK proof using Garaga verifier',
      parameters: [
        {
          name: 'proof',
          type: 'string',
          required: true,
          description: 'ZK proof to verify'
        },
        {
          name: 'publicInputs',
          type: 'array',
          required: true,
          description: 'Public inputs for verification'
        }
      ],
      execute: this.verifyProof.bind(this)
    },
    {
      name: 'getProofStatus',
      description: 'Check if a proof is still valid',
      parameters: [
        {
          name: 'proofHash',
          type: 'string',
          required: true,
          description: 'Hash of the proof to check'
        }
      ],
      execute: this.getProofStatus.bind(this)
    },
    {
      name: 'registerAgent',
      description: 'Register agent with ZK proof in ZKPassport contract',
      parameters: [
        {
          name: 'agentAddress',
          type: 'string',
          required: true,
          description: 'Agent address to register'
        },
        {
          name: 'zkProof',
          type: 'string',
          required: true,
          description: 'ZK proof for registration'
        }
      ],
      execute: this.registerAgent.bind(this)
    }
  ];

  async initialize(config: PluginConfig, context: AgentContext): Promise<void> {
    this.config = config.config as ZKProofPluginConfig;
    this.context = context;

    this.config.backendUrl = this.config.backendUrl || context.backendUrl;

    context.logger?.info('ZKProof plugin initialized', {
      verifierType: this.config.verifierType,
      proofExpiration: this.config.proofExpiration
    });

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.context.logger?.info('ZKProof plugin shutdown');
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      // Check if backend is reachable
      const response = await fetch(`${this.config.backendUrl}/health`);
      return response.ok;
    } catch (error) {
      this.context.logger?.error('ZKProof plugin health check failed:', error);
      return false;
    }
  }

  /**
   * Generate a real Groth16 ZK proof for agent identity.
   *
   * Delegates to the backend /api/v1/plugins/zkproof/generate endpoint
   * which runs snarkjs.groth16.fullProve() over agent_identity.circom
   * and converts the proof to Garaga calldata for on-chain verification.
   */
  private async generateProof(params: any): Promise<ActionResult> {
    const { agentAddress, secret } = params;

    if (!agentAddress) {
      return { success: false, error: 'agentAddress is required' };
    }

    try {
      const response = await fetch(
        `${this.config.backendUrl}/api/v1/plugins/zkproof/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentAddress, secret })
        }
      );

      const body = await response.json() as any;

      if (!response.ok || !body.success) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const { proofId, proof, publicSignals, calldata, commitment, expiresAt } = body.data;

      const zkProof: ZKProof = {
        proof: JSON.stringify(proof),
        publicInputs: publicSignals,
        verifierType: this.config.verifierType,
        timestamp: Math.floor(Date.now() / 1000),
        expiresAt
      };

      this.context.logger?.info('Real Groth16 ZK proof generated', {
        agentAddress,
        proofId,
        commitment,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        calldataLen: calldata?.length
      });

      return {
        success: true,
        data: {
          ...zkProof,
          proofId,
          calldata, // Garaga full_proof_with_hints for on-chain verification
          commitment
        },
        metadata: {
          validUntil: new Date(expiresAt * 1000).toISOString(),
          verifierType: this.config.verifierType
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to generate ZK proof:', error);
      return {
        success: false,
        error: error.message || 'Unknown error generating proof'
      };
    }
  }

  /**
   * Verify a Groth16 ZK proof using snarkjs local verification.
   *
   * Delegates to the backend /api/v1/plugins/zkproof/verify endpoint.
   */
  private async verifyProof(params: any): Promise<ActionResult> {
    const { proof, publicSignals } = params;

    if (!proof || !publicSignals) {
      return { success: false, error: 'proof and publicSignals are required' };
    }

    try {
      const response = await fetch(
        `${this.config.backendUrl}/api/v1/plugins/zkproof/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proof: typeof proof === 'string' ? JSON.parse(proof) : proof,
            publicSignals
          })
        }
      );

      const body = await response.json() as any;

      if (!response.ok || !body.success) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const { isValid, agentAddress, commitment, expiresAt, expired } = body.data;

      this.context.logger?.info('ZK proof verification result', { isValid, agentAddress });

      return {
        success: true,
        data: {
          isValid,
          agentAddress,
          commitment,
          expiresAt,
          expired,
          reason: isValid ? 'Valid Groth16 proof' : 'Invalid proof'
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to verify ZK proof:', error);
      return {
        success: false,
        error: error.message || 'Unknown error verifying proof'
      };
    }
  }

  /**
   * Get proof status (valid/expired)
   */
  private async getProofStatus(params: any): Promise<ActionResult> {
    const { proofHash } = params;

    try {
      // Query backend for proof status
      const response = await fetch(
        `${this.config.backendUrl}/api/v1/agents/proof/${proofHash}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Proof not found');
      }

      const data = await response.json() as any;

      return {
        success: true,
        data: {
          proofHash,
          status: data.status,
          agentAddress: data.agentAddress,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          isValid: data.isValid
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to get proof status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting proof status'
      };
    }
  }

  /**
   * Register agent with ZK proof in ZKPassport contract
   */
  private async registerAgent(params: any): Promise<ActionResult> {
    const { agentAddress, zkProof } = params;

    try {
      // Call backend API to register agent
      const response = await fetch(
        `${this.config.backendUrl}/api/v1/agents/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agentAddress,
            zkProof,
            verifierType: this.config.verifierType
          })
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.message || 'Failed to register agent');
      }

      const result = await response.json() as any;

      this.context.logger?.info('Agent registered with ZK proof', {
        agentAddress,
        txHash: result.txHash
      });

      return {
        success: true,
        data: {
          agentAddress,
          registrationId: result.id,
          proofHash: zkProof,
          status: 'registered'
        },
        txHash: result.txHash,
        metadata: {
          registeredAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      this.context.logger?.error('Failed to register agent:', error);
      return {
        success: false,
        error: error.message || 'Unknown error registering agent'
      };
    }
  }
}
