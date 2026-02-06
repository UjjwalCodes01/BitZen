"use strict";
/**
 * BitZen Plugin Manager
 *
 * Manages lifecycle and execution of agent plugins
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
class PluginManager {
    constructor(context) {
        this.plugins = new Map();
        this.context = context;
        this.logger = context.logger || this.createDefaultLogger();
    }
    /**
     * Register a plugin
     */
    async registerPlugin(plugin, config) {
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
        }
        catch (error) {
            this.logger.error(`Failed to register plugin ${plugin.name}:`, error);
            throw error;
        }
    }
    /**
     * Get a registered plugin
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }
    /**
     * Execute a plugin action
     */
    async executeAction(pluginName, actionName, params) {
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
        }
        catch (error) {
            this.logger.error(`Action ${pluginName}.${actionName} failed:`, error);
            throw error;
        }
    }
    /**
     * List all registered plugins
     */
    listPlugins() {
        return Array.from(this.plugins.keys());
    }
    /**
     * List all actions from a plugin
     */
    listActions(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }
        return plugin.actions.map(a => a.name);
    }
    /**
     * Health check all plugins
     */
    async healthCheckAll() {
        const results = {};
        for (const [name, plugin] of this.plugins.entries()) {
            try {
                results[name] = await plugin.healthCheck();
            }
            catch (error) {
                this.logger.error(`Health check failed for ${name}:`, error);
                results[name] = false;
            }
        }
        return results;
    }
    /**
     * Shutdown all plugins
     */
    async shutdownAll() {
        for (const [name, plugin] of this.plugins.entries()) {
            try {
                await plugin.shutdown();
                this.logger.info(`Plugin ${name} shutdown successfully`);
            }
            catch (error) {
                this.logger.error(`Failed to shutdown plugin ${name}:`, error);
            }
        }
        this.plugins.clear();
    }
    /**
     * Create default console logger
     */
    createDefaultLogger() {
        return {
            info: (message, meta) => {
                console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
            },
            error: (message, meta) => {
                console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
            },
            warn: (message, meta) => {
                console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
            },
            debug: (message, meta) => {
                console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
            }
        };
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=PluginManager.js.map