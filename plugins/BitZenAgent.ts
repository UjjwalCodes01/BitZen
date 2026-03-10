/**
 * BitZen Agent - Main Integration
 * 
 * Autonomous AI agent with Bitcoin liquidity and ZK privacy on Starknet
 */

import { PluginManager } from './PluginManager';
import { BitcoinPlugin } from './bitcoin/BitcoinPlugin';
import { ZKProofPlugin } from './zkproof/ZKProofPlugin';
import { AccountPlugin } from './account/AccountPlugin';
import { AgentContext, PluginConfig } from './types';
import { ec, typedData as starknetTypedData } from 'starknet';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Load env from backend .env (has all Starknet keys, RPC URLs, etc.)
dotenv.config({ path: path.join(__dirname, '../packages/backend/.env') });

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  temperature: number;
  plugins: PluginConfig[];
  autonomousMode: boolean;
  chatMode: boolean;
  commands: Record<string, string>;
}

export class BitZenAgent {
  public pluginManager: PluginManager;
  private config: AgentConfig;
  private context: AgentContext;

  constructor(
    configPath: string,
    context: AgentContext
  ) {
    // Load agent configuration
    const configFile = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configFile);
    
    this.context = context;
    this.pluginManager = new PluginManager(context);
  }

  /**
   * Initialize all plugins
   */
  async initialize(): Promise<void> {
    console.log(`\n🤖 Initializing ${this.config.name}...`);
    console.log(`📋 ${this.config.description}\n`);

    // Authenticate with backend to get JWT
    await this.authenticate();

    // Register plugins
    for (const pluginConfig of this.config.plugins) {
      await this.registerPlugin(pluginConfig);
    }

    // Health check
    const health = await this.pluginManager.healthCheckAll();
    console.log('\n📊 Plugin Health Check:', health);
    console.log('\n✅ Agent initialized successfully!\n');
  }

  /**
   * Authenticate agent with the backend using SNIP-12 typed data signing.
   * Gets a JWT that plugins use for authenticated backend calls.
   */
  private async authenticate(): Promise<void> {
    const privateKey = process.env.STARKNET_PRIVATE_KEY;
    if (!privateKey) {
      console.warn('⚠️  STARKNET_PRIVATE_KEY not set — skipping auth (some features will be unavailable)');
      return;
    }

    try {
      // Step 1: Request nonce / typed data from backend
      const nonceRes = await fetch(`${this.context.backendUrl}/api/v1/auth/sign-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: this.context.agentAddress }),
      });

      if (!nonceRes.ok) {
        const err = await nonceRes.json().catch(() => ({ error: nonceRes.statusText })) as any;
        throw new Error(`Failed to get nonce: ${err.error || err.message || nonceRes.statusText}`);
      }

      const nonceBody = await nonceRes.json() as any;
      const loginTypedData = nonceBody.data?.typedData || nonceBody.typedData;

      if (!loginTypedData) {
        throw new Error('No typedData in sign-message response');
      }

      // Step 2: Compute SNIP-12 message hash and sign with private key
      const msgHash = starknetTypedData.getMessageHash(loginTypedData, this.context.agentAddress);
      // Pad hash to 64 hex chars (required by @noble/curves for deterministic signing)
      const hashHex = msgHash.replace('0x', '').padStart(64, '0');
      const sig = ec.starkCurve.sign(hashHex, privateKey.replace('0x', ''));
      const signature = [sig.r.toString(), sig.s.toString()];

      // Step 3: Submit signature to get JWT
      const verifyRes = await fetch(`${this.context.backendUrl}/api/v1/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: this.context.agentAddress,
          signature,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({ error: verifyRes.statusText })) as any;
        throw new Error(`Auth verify failed: ${err.error || err.message || verifyRes.statusText}`);
      }

      const verifyBody = await verifyRes.json() as any;
      const token = verifyBody.data?.token || verifyBody.token;

      if (!token) {
        throw new Error('No token in verify response');
      }

      // Store token in context so all plugins can use it
      this.context.authToken = token;
      console.log('🔑 Agent authenticated with backend successfully');
    } catch (error: any) {
      console.warn(`⚠️  Agent auth failed: ${error.message}`);
      console.warn('   Some authenticated features (swaps, sessions) will be unavailable');
    }
  }

  /**
   * Register a plugin based on config
   */
  private async registerPlugin(config: PluginConfig): Promise<void> {
    let plugin;

    switch (config.name) {
      case 'bitcoin':
        plugin = new BitcoinPlugin();
        break;
      case 'zkproof':
        plugin = new ZKProofPlugin();
        break;
      case 'account':
        plugin = new AccountPlugin();
        break;
      default:
        throw new Error(`Unknown plugin: ${config.name}`);
    }

    await this.pluginManager.registerPlugin(plugin, config);
  }

  /**
   * Execute a command
   */
  async executeCommand(command: string, params: any): Promise<any> {
    // Parse command to plugin.action format
    const [pluginName, actionName] = this.parseCommand(command);

    if (!pluginName || !actionName) {
      throw new Error(`Invalid command: ${command}`);
    }

    return await this.pluginManager.executeAction(pluginName, actionName, params);
  }

  /**
   * Process natural language input
   */
  async processInput(input: string): Promise<string> {
    // Simplified NLP - in production, use LLM for intent recognition
    const lowerInput = input.toLowerCase();

    // Bitcoin commands
    if (lowerInput.includes('swap') || lowerInput.includes('exchange')) {
      if (lowerInput.includes('btc') && lowerInput.includes('strk')) {
        return this.handleSwapCommand(input);
      }
    }

    // ZK proof commands
    if (lowerInput.includes('proof') || lowerInput.includes('verify')) {
      return this.handleProofCommand(input);
    }

    // Account commands
    if (lowerInput.includes('session') || lowerInput.includes('key')) {
      return this.handleAccountCommand(input);
    }

    // Balance check
    if (lowerInput.includes('balance')) {
      return this.handleBalanceCommand(input);
    }

    // Help
    if (lowerInput === 'help' || lowerInput === '?') {
      return 'Available commands:\n' +
             '  balance           - Check Bitcoin balance\n' +
             '  swap / exchange   - Get BTC ↔ STRK swap quote\n' +
             '  session / key     - Create a session key\n' +
             '  proof / verify    - Generate or verify ZK proof\n' +
             '  help              - Show this help\n' +
             '  exit / quit       - Stop the agent';
    }

    return 'I can help you with:\n' +
           '- Bitcoin swaps (swap, exchange)\n' +
           '- ZK proofs (proof, verify)\n' +
           '- Session keys (session, key)\n' +
           '- Balance checks (balance)\n\n' +
           'Type "help" for all commands.';
  }

  /**
   * List available commands
   */
  listCommands(): string[] {
    return Object.keys(this.config.commands);
  }

  /**
   * Get command description
   */
  getCommandHelp(command: string): string {
    return this.config.commands[command] || 'Command not found';
  }

  /**
   * Shutdown agent
   */
  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down agent...');
    await this.pluginManager.shutdownAll();
    console.log('✅ Agent shutdown complete\n');
  }

  /**
   * Parse command string to plugin.action
   */
  private parseCommand(command: string): [string, string] {
    const commandMap: Record<string, [string, string]> = {
      'swap': ['bitcoin', 'executeSwap'],
      'getQuote': ['bitcoin', 'getSwapQuote'],
      'createSession': ['account', 'createSessionKey'],
      'verifyProof': ['zkproof', 'verifyProof'],
      'checkBalance': ['bitcoin', 'getBTCBalance'],
      'register': ['zkproof', 'registerAgent']
    };

    return commandMap[command] || ['', ''];
  }

  /**
   * Handle swap commands
   */
  private async handleSwapCommand(input: string): Promise<string> {
    // Extract swap details (simplified)
    const result = await this.executeCommand('getQuote', {
      fromCurrency: 'BTC',
      toCurrency: 'STRK',
      amount: '10000000' // 0.1 BTC in satoshis
    });

    if (result.success) {
      return `Swap Quote:\n` +
             `Input: ${result.data.inputAmount} BTC\n` +
             `Output: ${result.data.outputAmount} STRK\n` +
             `Rate: ${result.data.exchangeRate}\n` +
             `Fee: ${result.data.fee}\n\n` +
             `Would you like to execute this swap?`;
    }

    return `Error: ${result.error}`;
  }

  /**
   * Handle proof commands
   */
  private async handleProofCommand(input: string): Promise<string> {
    const result = await this.executeCommand('verifyProof', {
      proof: '0x123...',
      publicInputs: [this.context.agentAddress, Date.now().toString()]
    });

    if (result.success) {
      return `ZK Proof Verification:\n` +
             `Status: ${result.data.isValid ? '✅ Valid' : '❌ Invalid'}\n` +
             `Reason: ${result.data.reason}`;
    }

    return `Error: ${result.error}`;
  }

  /**
   * Handle account commands
   */
  private async handleAccountCommand(input: string): Promise<string> {
    const result = await this.executeCommand('createSession', {
      duration: 86400, // 24 hours
      permissions: ['execute', 'swap', 'stake', 'transfer'],
    });

    if (result.success) {
      return `Session Key Created:\n` +
             `Public Key: ${result.data.sessionPublicKey.substring(0, 20)}...\n` +
             `Expires: ${result.metadata.validUntil}\n` +
             `Permissions: Full access`;
    }

    return `Error: ${result.error}`;
  }

  /**
   * Handle balance commands
   */
  private async handleBalanceCommand(input: string): Promise<string> {
    const result = await this.executeCommand('checkBalance', {});

    if (result.success) {
      return `Bitcoin Balance:\n` +
             `Address: ${result.data.address}\n` +
             `Balance: ${result.data.balanceBTC} BTC\n` +
             `Network: ${result.data.network}`;
    }

    return `Error: ${result.error}`;
  }
}

/**
 * Interactive agent REPL
 */
export async function runAgent() {
  const context: AgentContext = {
    agentAddress: process.env.ACCOUNT_ADDRESS || '0x123...',
    network: 'sepolia',
    rpcUrl: process.env.STARKNET_RPC_URL || '',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3002'
  };

  const configPath = path.join(__dirname, '../config/agents/bitzen.agent.json');
  const agent = new BitZenAgent(configPath, context);

  try {
    await agent.initialize();

    console.log('\n💬 BitZen Agent Interactive Mode');
    console.log('   Type your commands below. Type "exit" or "quit" to stop.\n');
    console.log('   Examples:');
    console.log('     What is my Bitcoin balance?');
    console.log('     Get quote for BTC to STRK swap');
    console.log('     Create a session key');
    console.log('     Generate a ZK proof');
    console.log('     help\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 > ',
    });

    rl.prompt();

    rl.on('line', async (line: string) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      try {
        const response = await agent.processInput(input);
        console.log(`\n${response}\n`);
      } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}\n`);
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      await agent.shutdown();
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n');
      rl.close();
    });

  } catch (error) {
    console.error('Agent initialization error:', error);
    await agent.shutdown();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAgent().catch(console.error);
}
