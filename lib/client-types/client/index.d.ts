/**
 * Browser client entry.
 *
 * Slot contracts inspected in DeepSeek Harness dsh-v0.1.0-rc.7:
 * - `settings.section` (list, id + order + label, owner.close)
 * - `settings.plugin.item` (keyed; nested inject so older hosts omit the card)
 * - `shell.overlay` (list)
 *
 * Module-level inject is `slots` + `locale`. `settingsScope` is nested so hosts
 * before rc.7 omit the Plugins card instead of failing to mount.
 */
interface LocaleService {
    register(namespace: string, dicts: {
        zh: Record<string, string>;
        en: Record<string, string>;
    }): unknown;
    bind(namespace: string): (key: string, params?: Record<string, unknown>) => string;
}
interface SlotsService {
    inject(slot: string, register: () => unknown): void;
    register(meta: Record<string, unknown>, component: () => unknown): unknown;
}
interface ClientContext {
    effect(callback: () => unknown, label?: string): void;
    locale: LocaleService;
    slots: SlotsService;
    inject?(services: string[], callback: (scoped: {
        slots: SlotsService;
    }) => void): void;
}
export declare const name = "dsh-dify-marketplace";
export declare const inject: string[];
/**
 * Register the Dify Marketplace settings section.
 * @param ctx - client context.
 */
export declare function apply(ctx: ClientContext): void;
export {};
//# sourceMappingURL=index.d.ts.map