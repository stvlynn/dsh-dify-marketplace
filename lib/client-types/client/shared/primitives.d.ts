/**
 * Host primitive names this client requires. Missing names disable the section
 * instead of throwing during apply.
 *
 * @module dsh-dify-marketplace/client/shared/primitives
 */
export declare const REQUIRED_PRIMITIVES: readonly ["Button", "Input", "Pill", "StateDot"];
/**
 * Names from `required` that are absent on the host primitives module.
 * @param mod - the loaded `@deepseek-ai/dsh-client-ui-primitives` module.
 * @param required - primitive export names this client uses.
 */
export declare function missingPrimitives(mod: Record<string, unknown>, required?: readonly string[]): string[];
//# sourceMappingURL=primitives.d.ts.map