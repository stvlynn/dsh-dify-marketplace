/**
 * Register each Dify tool as a model-facing DSH tool.
 *
 * @module dsh-dify-marketplace/runtime/adapters/tool
 */
import { toolName } from "../../shared/identifier.js";
import { collectChunks, defineDifyTool } from "../define-dify-tool.js";
import { mapToolParameters } from "../parameters.js";
/** Tool-category adapter. */
export const registerToolAdapter = (ctx, config, deps) => {
    const names = [];
    for (const tool of config.snapshot.tools) {
        const publicName = toolName(config.org, config.name, tool.name);
        const definition = defineDifyTool({
            name: publicName,
            description: tool.description,
            parameters: mapToolParameters(tool.parameters),
            async execute(args, signal) {
                const stored = await deps.vault.read(config.pluginId);
                return collectChunks(deps.daemon.dispatchStream('toolInvoke', config.pluginId, {
                    provider: config.snapshot.provider,
                    tool: tool.name,
                    tool_parameters: args,
                    credentials: stored?.values ?? {},
                    ...(stored?.credentialType === undefined ? {} : { credential_type: stored.credentialType }),
                }, signal));
            },
        });
        ctx.effect(() => ctx.tools.register(definition), `dify:${publicName}`);
        names.push(publicName);
    }
    return names;
};
//# sourceMappingURL=tool.js.map