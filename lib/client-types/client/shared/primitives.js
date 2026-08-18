/**
 * Host primitive names this client requires. Missing names disable the section
 * instead of throwing during apply.
 *
 * @module dsh-dify-marketplace/client/shared/primitives
 */
export const REQUIRED_PRIMITIVES = ['Button', 'Input', 'Pill', 'StateDot'];
/**
 * Names from `required` that are absent on the host primitives module.
 * @param mod - the loaded `@deepseek-ai/dsh-client-ui-primitives` module.
 * @param required - primitive export names this client uses.
 */
export function missingPrimitives(mod, required = REQUIRED_PRIMITIVES) {
    return required.filter(name => mod[name] === undefined);
}
//# sourceMappingURL=primitives.js.map