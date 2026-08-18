/**
 * Trigger plugins become subscribe and unsubscribe tools.
 *
 * @module dsh-dify-marketplace/runtime/adapters/trigger
 */
import { TRIGGER_OPERATIONS } from "../../host/domain/capability.js";
import { toolName } from "../../shared/identifier.js";
import { defineDifyTool } from "../define-dify-tool.js";
/** Trigger adapter. */
export const registerTriggerAdapter = (ctx, config, deps) => {
    const names = [];
    for (const operation of TRIGGER_OPERATIONS) {
        const publicName = toolName(config.org, config.name, operation);
        const route = operation === 'subscribe' ? 'triggerSubscribe' : 'triggerUnsubscribe';
        const definition = defineDifyTool({
            name: publicName,
            description: operation === 'subscribe'
                ? `Subscribe to events from Dify trigger ${config.pluginId}.`
                : `Unsubscribe a Dify trigger subscription for ${config.pluginId}.`,
            parameters: {
                parameters: { type: 'json', description: 'Trigger parameters declared by the plugin.' },
                endpoint: { type: 'string', description: 'Callback URL the trigger should invoke.' },
            },
            async execute(args, signal) {
                const stored = await deps.vault.read(config.pluginId);
                return deps.daemon.dispatch(route, config.pluginId, {
                    provider: config.snapshot.provider,
                    trigger: config.name,
                    credentials: stored?.values ?? {},
                    parameters: args.parameters ?? {},
                    endpoint: args.endpoint,
                }, signal);
            },
        });
        ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
        names.push(publicName);
    }
    return names;
};
//# sourceMappingURL=trigger.js.map