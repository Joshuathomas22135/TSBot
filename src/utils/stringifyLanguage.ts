/**
 * Shared language configuration used across the bot.
 * Provides a single source of truth for language codes, names, and country mappings.
 */

export interface LanguageChoice {
    name: string;
    value: string;
}

/**
 * Complete list of supported languages with their codes and display names.
 */
export const LANGUAGE_CHOICES: LanguageChoice[] = [
    { name: "English", value: "en" },
    { name: "German", value: "de" },
    { name: "French", value: "fr" },
    { name: "Spanish", value: "es" },
    { name: "Italian", value: "it" },
    { name: "Japanese", value: "ja" },
    { name: "Korean", value: "ko" },
    { name: "Portuguese", value: "pt" },
    { name: "Russian", value: "ru" },
    { name: "Chinese", value: "zh" },
    { name: "Arabic", value: "ar" },
    { name: "Bengali", value: "bn" },
    { name: "Dutch", value: "nl" },
    { name: "Finnish", value: "fi" },
    { name: "Greek", value: "el" },
    { name: "Hindi", value: "hi" },
    { name: "Indonesian", value: "id" },
    { name: "Malay", value: "ms" },
    { name: "Norwegian", value: "no" },
    { name: "Polish", value: "pl" },
    { name: "Swedish", value: "sv" },
    { name: "Thai", value: "th" },
    { name: "Turkish", value: "tr" },
    { name: "Vietnamese", value: "vi" },
    { name: "Welsh", value: "cy" }
];

/**
 * Mapping from language codes to country codes for flag display.
 */
export const LANGUAGE_TO_COUNTRY: { [key: string]: string } = {
    'en': 'gb',
    'de': 'de',
    'fr': 'fr',
    'es': 'es',
    'it': 'it',
    'ja': 'jp',
    'ko': 'kr',
    'pt': 'pt',
    'ru': 'ru',
    'zh': 'cn',
    'ar': 'sa',
    'bn': 'bd',
    'nl': 'nl',
    'fi': 'fi',
    'el': 'gr',
    'hi': 'in',
    'id': 'id',
    'ms': 'my',
    'no': 'no',
    'pl': 'pl',
    'sv': 'se',
    'th': 'th',
    'tr': 'tr',
    'vi': 'vn',
    'cy': 'gb'
};

/**
 * Converts a language code (e.g., "en") to its full name (e.g., "English").
 * @param language - The language code to convert.
 * @returns The corresponding language name, or "Unknown" if not found.
 */
export default function stringifyLanguage(language: string): string {
    const foundLanguage = LANGUAGE_CHOICES.find(lang => lang.value === language);
    return foundLanguage ? foundLanguage.name : "Unknown";
}