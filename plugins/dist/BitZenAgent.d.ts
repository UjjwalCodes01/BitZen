/**
 * BitZen Agent - Main Integration
 *
 * Autonomous AI agent with Bitcoin liquidity and ZK privacy on Starknet
 */
import { PluginManager } from './PluginManager';
import { AgentContext, PluginConfig } from './types';
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
export declare class BitZenAgent {
    pluginManager: PluginManager;
    private config;
    private context;
    constructor(configPath: string, context: AgentContext);
    /**
     * Initialize all plugins
     */
    initialize(): Promise<void>;
    /**
     * Register a plugin based on config
     */
    private registerPlugin;
    /**
     * Execute a command
     */
    executeCommand(command: string, params: any): Promise<any>;
    /**
     * Process natural language input
     */
    processInput(input: string): Promise<string>;
    /**
     * List available commands
     */
    listCommands(): string[];
    /**
     * Get command description
     */
    getCommandHelp(command: string): string;
    /**
     * Shutdown agent
     */
    shutdown(): Promise<void>;
    /**
     * Parse command string to plugin.action
     */
    private parseCommand;
    /**
     * Handle swap commands
     */
    private handleSwapCommand;
    /**
     * Handle proof commands
     */
    private handleProofCommand;
    /**
     * Handle account commands
     */
    private handleAccountCommand;
    /**
     * Handle balance commands
     */
    private handleBalanceCommand;
}
/**
 * Example usage
 */
export declare function runAgent(): Promise<void>;
//# sourceMappingURL=BitZenAgent.d.ts.map