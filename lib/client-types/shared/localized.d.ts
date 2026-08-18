/**
 * Pick a display string from a Dify i18n object.
 *
 * @module dsh-dify-marketplace/shared/localized
 */
import type { DifyI18nObject } from './contracts/marketplace.ts';
/**
 * Resolve one localized string, preferring the requested locale then English,
 * then Simplified Chinese, then the first remaining value.
 * @param map - Dify i18n object, or undefined.
 * @param locale - requested locale (`en_US`, `zh_Hans`, or a UI locale).
 * @returns the resolved string, empty when the map is empty.
 */
export declare function localized(map: DifyI18nObject | string | undefined, locale?: string): string;
//# sourceMappingURL=localized.d.ts.map