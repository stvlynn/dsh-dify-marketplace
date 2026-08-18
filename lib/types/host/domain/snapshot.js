/**
 * Durable declaration snapshot for one installed Dify plugin.
 *
 * Boot rehydration must not depend on the marketplace still serving the same
 * detail document, so the Host stores the fields the adapters need.
 *
 * @module dsh-dify-marketplace/host/domain/snapshot
 */
import { localized } from "../../shared/localized.js";
/**
 * Extract a snapshot from a marketplace detail record.
 * @param detail - marketplace plugin document.
 * @returns the durable snapshot.
 */
export function snapshotFromDetail(detail) {
    const tool = detail.tool;
    const model = detail.model;
    const strategy = detail.agent_strategy;
    const tools = 'tools' in tool && Array.isArray(tool.tools)
        ? tool.tools.map(declared => ({
            name: declared.identity.name,
            description: declared.description.llm || localized(declared.description.human),
            parameters: declared.parameters ?? [],
        }))
        : [];
    const strategies = 'strategies' in strategy && Array.isArray(strategy.strategies)
        ? strategy.strategies.map((entry) => {
            const record = entry;
            const name = record.identity?.name ?? 'strategy';
            const description = typeof record.description === 'object' && record.description !== null
                && 'llm' in record.description && typeof record.description.llm === 'string'
                ? record.description.llm
                : localized(record.identity?.label);
            return { name, description, parameters: record.parameters ?? [] };
        })
        : [];
    const credentialFields = 'credentials_schema' in tool && Array.isArray(tool.credentials_schema)
        ? tool.credentials_schema
        : [];
    const provider = 'identity' in tool && tool.identity?.name !== undefined
        ? tool.identity.name
        : 'provider' in model && typeof model.provider === 'string'
            ? model.provider
            : 'identity' in strategy && strategy.identity?.name !== undefined
                ? strategy.identity.name
                : detail.name;
    const supportedModelTypes = 'supported_model_types' in model && Array.isArray(model.supported_model_types)
        ? model.supported_model_types
        : [];
    return {
        provider,
        credentialFields,
        tools,
        strategies,
        supportedModelTypes,
        endpoint: 'endpoints' in detail.endpoint && Array.isArray(detail.endpoint.endpoints)
            && detail.endpoint.endpoints.length > 0,
    };
}
/**
 * Credential fields a model plugin declares, if any.
 * @param detail - marketplace plugin document.
 */
export function modelCredentialFields(detail) {
    const schema = 'provider_credential_schema' in detail.model
        ? detail.model.provider_credential_schema
        : null;
    const forms = schema?.credential_form_schemas;
    if (!Array.isArray(forms))
        return [];
    return forms;
}
//# sourceMappingURL=snapshot.js.map