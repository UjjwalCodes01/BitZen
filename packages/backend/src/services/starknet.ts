import { Account, CallData, Contract, RpcProvider, num } from 'starknet';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// Import ABIs
const ZKPassportABI = require('../../abis/ZKPassport.json');
const ServiceRegistryABI = require('../../abis/ServiceRegistry.json');

export class StarknetService {
  private provider: RpcProvider;
  private account: Account | null = null;
  private zkPassportContract: Contract;
  private serviceRegistryContract: Contract;

  constructor() {
    // Initialize provider
    this.provider = new RpcProvider({
      nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/oX6CVMWKcDva93Z4ZrmZ1',
    });

    // Initialize contracts
    this.zkPassportContract = new Contract(
      ZKPassportABI,
      process.env.ZKPASSPORT_ADDRESS || '',
      this.provider
    );

    this.serviceRegistryContract = new Contract(
      ServiceRegistryABI,
      process.env.SERVICE_REGISTRY_ADDRESS || '',
      this.provider
    );

    // Initialize account if private key is available
    if (process.env.STARKNET_PRIVATE_KEY) {
      this.initializeAccount();
    }
  }

  private initializeAccount() {
    try {
      const privateKey = process.env.STARKNET_PRIVATE_KEY;
      const accountAddress = process.env.ACCOUNT_ADDRESS;

      // Only initialize account if both private key and address are available
      if (!privateKey || !accountAddress) {
        logger.warn('Starknet account not fully configured. Read-only mode.');
        return;
      }

      this.account = new Account(this.provider, accountAddress, privateKey, '1');
      
      // Connect contracts to account for write operations
      this.zkPassportContract.connect(this.account);
      this.serviceRegistryContract.connect(this.account);

      logger.info('Starknet account initialized');
    } catch (error) {
      logger.error('Failed to initialize Starknet account:', error);
    }
  }

  /**
   * Register an agent with ZK proof on ZKPassport contract
   * proof_data must have >= 8 felt252 elements (a,b,c components of Groth16 proof)
   * public_inputs must have >= 1 felt252 element
   */
  async registerAgent(
    address: string,
    proofData: string[],
    publicInputs: string[]
  ): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not configured', 500);
      }

      logger.info(`Registering agent on ZKPassport: ${address}`);

      // Ensure proof meets MockGaragaVerifier minimum requirements:
      // proof_data must have >= 8 elements, public_inputs >= 1 element
      const normalizedProof = proofData.length >= 8
        ? proofData
        : [...proofData, ...Array(8 - proofData.length).fill('0x1')];

      const normalizedInputs = publicInputs.length >= 1
        ? publicInputs
        : [address]; // Use agent address as default public input

      logger.info(`Proof elements: ${normalizedProof.length}, public inputs: ${normalizedInputs.length}`);

      // Build calldata for ZKPassport.register_agent(agent_address, proof_data, public_inputs)
      // Starknet Span<felt252> is serialized as: [len, elem0, elem1, ...]
      const calldata = [
        address,                               // agent_address
        normalizedProof.length.toString(),      // proof_data length
        ...normalizedProof,                    // proof_data elements
        normalizedInputs.length.toString(),    // public_inputs length
        ...normalizedInputs,                   // public_inputs elements
      ];

      logger.info(`ZKPassport address: ${this.zkPassportContract.address}`);
      logger.info(`Calldata length: ${calldata.length}`);

      const result = await this.account.execute({
        contractAddress: this.zkPassportContract.address,
        entrypoint: 'register_agent',
        calldata,
      });

      const { transaction_hash } = result;
      logger.info(`Agent registered on ZKPassport, tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error: any) {
      logger.error('Failed to register agent:', error.message || String(error));
      const errorMessage = error.message || 'Failed to register agent on-chain';
      throw new AppError(errorMessage, 500);
    }
  }

  /**
   * Get agent information from ZKPassport chain
   * Returns: (is_verified: bool, registered_at: u64, proof_hash: felt252)
   */
  async getAgentInfo(address: string): Promise<any> {
    try {
      const result = await this.zkPassportContract.get_agent_info(address);
      
      // Cairo tuple (bool, u64, felt252) → starknet.js returns an array or object
      // result[0] = is_verified, result[1] = registered_at, result[2] = proof_hash
      const isVerified = result[0] === true || result[0] === 1n || result[0] === '0x1';
      const registeredAt = result[1]?.toString() || '0';
      const proofHash = result[2]?.toString() || '0x0';

      return {
        is_verified: isVerified,
        registered_at: registeredAt,
        proof_hash: proofHash,
      };
    } catch (error) {
      logger.error('Failed to get agent info:', error);
      return null;
    }
  }

  /**
   * Revoke an agent
   */
  async revokeAgent(address: string): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not initialized', 500);
      }

      const { transaction_hash } = await this.account.execute({
        contractAddress: this.zkPassportContract.address,
        entrypoint: 'revoke_agent',
        calldata: CallData.compile({ agent_address: address }),
      });

      logger.info(`Agent revocation tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error) {
      logger.error('Failed to revoke agent:', error);
      throw new AppError('Failed to revoke agent on-chain', 500);
    }
  }

  /**
   * Register a service
   */
  async registerService(
    name: string,
    description: string,
    endpoint: string,
    stakeAmount: number
  ): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not initialized', 500);
      }

      logger.info(`Registering service on-chain: ${name}`);

      const callData = CallData.compile({
        name,
        description,
        endpoint,
        stake_amount: num.toHex(stakeAmount),
      });

      const { transaction_hash } = await this.account.execute({
        contractAddress: this.serviceRegistryContract.address,
        entrypoint: 'register_service',
        calldata: callData,
      });

      logger.info(`Service registration tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error) {
      logger.error('Failed to register service:', error);
      throw new AppError('Failed to register service on-chain', 500);
    }
  }

  /**
   * Get service information
   */
  async getServiceInfo(serviceId: string): Promise<any> {
    try {
      const result = await this.serviceRegistryContract.get_service_info(serviceId);
      
      return {
        provider: result.provider,
        name: result.name,
        endpoint: result.endpoint,
        total_stake: result.total_stake.toString(),
        is_active: result.is_active,
      };
    } catch (error) {
      logger.error('Failed to get service info:', error);
      return null;
    }
  }

  /**
   * Submit review for a service
   */
  async submitReview(
    serviceId: string,
    rating: number,
    reviewHash: string
  ): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not initialized', 500);
      }

      const callData = CallData.compile({
        service_id: serviceId,
        rating,
        review_hash: reviewHash,
      });

      const { transaction_hash } = await this.account.execute({
        contractAddress: this.serviceRegistryContract.address,
        entrypoint: 'submit_review',
        calldata: callData,
      });

      logger.info(`Review submission tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error) {
      logger.error('Failed to submit review:', error);
      throw new AppError('Failed to submit review on-chain', 500);
    }
  }

  /**
   * Stake as auditor
   */
  async stakeAsAuditor(serviceId: string, amount: number): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not initialized', 500);
      }

      const callData = CallData.compile({
        service_id: serviceId,
        amount: num.toHex(amount),
      });

      const { transaction_hash } = await this.account.execute({
        contractAddress: this.serviceRegistryContract.address,
        entrypoint: 'stake_as_auditor',
        calldata: callData,
      });

      logger.info(`Auditor staking tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error) {
      logger.error('Failed to stake as auditor:', error);
      throw new AppError('Failed to stake on-chain', 500);
    }
  }

  /**
   * Unstake from service
   */
  async unstake(serviceId: string): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not initialized', 500);
      }

      const { transaction_hash } = await this.account.execute({
        contractAddress: this.serviceRegistryContract.address,
        entrypoint: 'unstake',
        calldata: CallData.compile({ service_id: serviceId }),
      });

      logger.info(`Unstaking tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error) {
      logger.error('Failed to unstake:', error);
      throw new AppError('Failed to unstake on-chain', 500);
    }
  }

  /**
   * Create session for agent account
   */
  async createSession(
    agentAddress: string,
    sessionPublicKey: string,
    expirationBlock: number,
    maxSpendPerTx: number,
    allowedMethods: string[]
  ): Promise<string> {
    try {
      if (!this.account) {
        throw new AppError('Starknet account not initialized', 500);
      }

      const callData = CallData.compile({
        session_public_key: sessionPublicKey,
        expiration_block: expirationBlock,
        max_spend_per_tx: num.toHex(maxSpendPerTx),
        allowed_methods: allowedMethods,
      });

      const { transaction_hash } = await this.account.execute({
        contractAddress: agentAddress,
        entrypoint: 'create_session',
        calldata: callData,
      });

      logger.info(`Session creation tx: ${transaction_hash}`);
      return transaction_hash;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw new AppError('Failed to create session on-chain', 500);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string): Promise<boolean> {
    try {
      await this.provider.waitForTransaction(txHash);
      return true;
    } catch (error) {
      logger.error('Transaction failed:', error);
      return false;
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    try {
      const block = await this.provider.getBlockLatestAccepted();
      return block.block_number;
    } catch (error) {
      logger.error('Failed to get current block:', error);
      throw new AppError('Failed to get block number', 500);
    }
  }
}
