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
import { createElement as h } from 'react';
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives';
import { MarketplacePage } from "./pages/index.js";
import { NS, en, zh, missingPrimitives } from "./shared/index.js";
export const name = 'dsh-dify-marketplace';
export const inject = ['slots', 'locale'];
/**
 * Register the Dify Marketplace settings section.
 * @param ctx - client context.
 */
export function apply(ctx) {
    const gaps = missingPrimitives(primitives);
    if (gaps.length > 0) {
        console.warn(`[dsh-dify-marketplace] host ui-primitives missing ${gaps.join(', ')} — section disabled`);
        return;
    }
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dify-marketplace:dictionaries');
    const t = ctx.locale.bind(NS);
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'dify-marketplace',
        order: 55,
        label: () => t('nav'),
        locale: NS,
    }, () => h(MarketplacePage, { t: t })));
    ctx.inject?.(['settingsScope'], (scoped) => {
        scoped.slots.inject('settings.plugin.item', () => scoped.slots.register({
            name: 'settings.plugin.item',
            key: NS,
            locale: NS,
        }, () => h(MarketplacePage, { t: t })));
    });
}
//# sourceMappingURL=index.js.map