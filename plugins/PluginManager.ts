/**
 * BitZen Plugin Manager
 * 
 * Manages lifecycle and execution of agent plugins
 */

import { Plugin, PluginConfig, AgentContext, Logger } from './types';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private context: AgentContext;
  private logger: Logger;

  constructor(context: AgentContext) {
    this.context = context;
    this.logger = context.logger || this.createDefaultLogger();
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin, config: PluginConfig): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    if (!config.enabled) {
      this.logger.info(`Plugin ${plugin.name} is disabled, skipping registration`);
      return;
    }

    try {
      await plugin.initialize(config, this.context);
      this.plugins.set(plugin.name, plugin);
      this.logger.info(`Plugin ${plugin.name} registered successfully`);
    } catch (error) {
      this.logger.error(`Failed to register plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * Get a registered plugin
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Execute a plugin action
   */
  async executeAction(
    pluginName: string,
    actionName: string,
    params: any
  ): Promise<any> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    const action = plugin.actions.find(a => a.name === actionName);
    if (!action) {
      throw new Error(`Action ${actionName} not found in plugin ${pluginName}`);
    }

    this.logger.info(`Executing ${pluginName}.${actionName}`, { params });

    try {
      const result = await action.execute(params, this.context);
      this.logger.info(`Action ${pluginName}.${actionName} completed`, { result });
      return result;
    } catch (error) {
      this.logger.error(`Action ${pluginName}.${actionName} failed:`, error);
      throw error;
    }
  }

  /**
   * List all registered plugins
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * List all actions from a plugin
   */
  listActions(pluginName: string): string[] {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    return plugin.actions.map(a => a.name);
  }

  /**
   * Health check all plugins
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        results[name] = await plugin.healthCheck();
      } catch (error) {
        this.logger.error(`Health check failed for ${name}:`, error);
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Shutdown all plugins
   */
  async shutdownAll(): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        await plugin.shutdown();
        this.logger.info(`Plugin ${name} shutdown successfully`);
      } catch (error) {
        this.logger.error(`Failed to shutdown plugin ${name}:`, error);
      }
    }
    this.plugins.clear();
  }

  /**
   * Create default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      info: (message: string, meta?: any) => {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
      },
      debug: (message: string, meta?: any) => {
        console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
      }
    };
  }
}
