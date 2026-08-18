/**
 * Durable declaration snapshot for one installed Dify plugin.
 *
 * Boot rehydration must not depend on the marketplace still serving the same
 * detail document, so the Host stores the fields the adapters need.
 *
 * @module dsh-dify-marketplace/host/domain/snapshot
 */
import type { DifyCredentialField, DifyToolParameter, MarketplacePluginDetail } from '../../shared/contracts/marketplace.ts';
/** One model-facing tool or strategy the runtime will register. */
export interface SnapshotOperation {
    name: string;
    description: string;
    parameters: DifyToolParameter[];
}
/** Fields persisted with an install so adapters can rehydrate without the marketplace. */
export interface PluginSnapshot {
    provider: string;
    credentialFields: DifyCredentialField[];
    tools: SnapshotOperation[];
    strategies: SnapshotOperation[];
    supportedModelTypes: string[];
    endpoint: boolean;
}
/**
 * Extract a snapshot from a marketplace detail record.
 * @param detail - marketplace plugin document.
 * @returns the durable snapshot.
 */
export declare function snapshotFromDetail(detail: MarketplacePluginDetail): PluginSnapshot;
/**
 * Credential fields a model plugin declares, if any.
 * @param detail - marketplace plugin document.
 */
export declare function modelCredentialFields(detail: MarketplacePluginDetail): DifyCredentialField[];
//# sourceMappingURL=snapshot.d.ts.map