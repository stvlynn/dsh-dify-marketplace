/**
 * Pick a display string from a Dify i18n object.
 *
 * @module dsh-dify-marketplace/shared/localized
 */
/**
 * Resolve one localized string, preferring the requested locale then English,
 * then Simplified Chinese, then the first remaining value.
 * @param map - Dify i18n object, or undefined.
 * @param locale - requested locale (`en_US`, `zh_Hans`, or a UI locale).
 * @returns the resolved string, empty when the map is empty.
 */
export function localized(map, locale = 'en_US') {
    if (typeof map === 'string')
        return map;
    if (map === undefined)
        return '';
    const aliases = {
        en: ['en_US', 'en'],
        zh: ['zh_Hans', 'zh_Hant', 'zh'],
        'zh-CN': ['zh_Hans', 'zh'],
        'zh-TW': ['zh_Hant', 'zh_Hans', 'zh'],
    };
    const candidates = [locale, ...(aliases[locale] ?? []), 'en_US', 'zh_Hans'];
    for (const key of candidates) {
        const value = map[key];
        if (typeof value === 'string' && value !== '')
            return value;
    }
    for (const value of Object.values(map)) {
        if (typeof value === 'string' && value !== '')
            return value;
    }
    return '';
}
//# sourceMappingURL=localized.js.map