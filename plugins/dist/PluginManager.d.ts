/**
 * BitZen Plugin Manager
 *
 * Manages lifecycle and execution of agent plugins
 */
import { Plugin, PluginConfig, AgentContext } from './types';
export declare class PluginManager {
    private plugins;
    private context;
    private logger;
    constructor(context: AgentContext);
    /**
     * Register a plugin
     */
    registerPlugin(plugin: Plugin, config: PluginConfig): Promise<void>;
    /**
     * Get a registered plugin
     */
    getPlugin(name: string): Plugin | undefined;
    /**
     * Execute a plugin action
     */
    executeAction(pluginName: string, actionName: string, params: any): Promise<any>;
    /**
     * List all registered plugins
     */
    listPlugins(): string[];
    /**
     * List all actions from a plugin
     */
    listActions(pluginName: string): string[];
    /**
     * Health check all plugins
     */
    healthCheckAll(): Promise<Record<string, boolean>>;
    /**
     * Shutdown all plugins
     */
    shutdownAll(): Promise<void>;
    /**
     * Create default console logger
     */
    private createDefaultLogger;
}
//# sourceMappingURL=PluginManager.d.ts.map