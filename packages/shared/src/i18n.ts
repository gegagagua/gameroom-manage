import type { AlertType, SessionEndReason, TransactionType } from './types';

export type Lang = 'ka' | 'en';
export const LANGS: Lang[] = ['ka', 'en'];

/** Error codes returned by the API (see apps/api/src/common/api-error.ts). */
export const errorMessages: Record<Lang, Record<string, string>> = {
  ka: {
    VALIDATION_FAILED: 'შეყვანილი მონაცემები არასწორია',
    UNAUTHORIZED: 'საჭიროა ავტორიზაცია',
    FORBIDDEN: 'წვდომა აკრძალულია',
    NOT_FOUND: 'არ მოიძებნა',
    CONFLICT: 'კონფლიქტ — ჩანაწერ უკვე არსებობ',
    TOO_MANY_REQUESTS: 'ზედმეტად ბევრი მცდელობ, სცადეთ მოგვიანებით',
    INTERNAL: 'სერვერის შეცდომ',
    NETWORK: 'სერვერთან კავშირი ვერ მოხერხდ',
    INVALID_CREDENTIALS: 'არასწორი მომხმარებელი ან პაროლ',
    WRONG_CURRENT_PASSWORD: 'მიმდინარე პაროლი არასწორია',
    INVALID_RESET_TOKEN: 'ბმული არასწორია ან ვადაგასულია',
    USER_INACTIVE: 'მომხმარებელი დეაქტივირებულია',
    EMAIL_TAKEN: 'ეს ელ. ფოსტა უკვე გამოყენებულია',
    PHONE_TAKEN: 'ეს ტელეფონი უკვე გამოყენებულია',
    USER_NOT_FOUND: 'მომხმარებელი არ მოიძებნა',
    USER_HAS_ACTIVE_SESSION: 'მომხმარებელ აქვს აქტიური სესი',
    INSUFFICIENT_BALANCE: 'ბალანსი არ არის საკმარის',
    NO_BALANCE: 'ბალანსი ცარიელია — მიმართეთ ადმინისტრატორ',
    INVALID_PC_KEY: 'PC-ის გასაღები არასწორია (პარამეტრებ)',
    PC_NOT_FOUND: 'ეს PC ნომერი არ არის რეგისტრირებულ',
    ALREADY_LOGGED_IN_ELSEWHERE: 'მომხმარებელი უკვე შესულია სხვა PC-ზ',
    INVALID_SESSION_TOKEN: 'სესია ვადაგასულია',
    INVALID_DATE_RANGE: 'თარიღების დიაპაზონ არასწორია',
    GAME_NOT_FOUND: 'თამაში არ მოიძებნა',
    GAME_LAUNCH_CONFIG_INVALID: 'გაშვების პარამეტრ არასწორია: STEAM → Steam App ID, EXE → ფაილის მისამარ, URL → ბმულ',
  },
  en: {
    VALIDATION_FAILED: 'Invalid input',
    UNAUTHORIZED: 'Please sign in',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Not found',
    CONFLICT: 'Conflict — record already exists',
    TOO_MANY_REQUESTS: 'Too many attempts, try again later',
    INTERNAL: 'Server error',
    NETWORK: 'Cannot reach the server',
    INVALID_CREDENTIALS: 'Invalid login or password',
    WRONG_CURRENT_PASSWORD: 'Current password is incorrect',
    INVALID_RESET_TOKEN: 'The link is invalid or expired',
    USER_INACTIVE: 'User is deactivated',
    EMAIL_TAKEN: 'This email is already in use',
    PHONE_TAKEN: 'This phone is already in use',
    USER_NOT_FOUND: 'User not found',
    USER_HAS_ACTIVE_SESSION: 'User has an active session',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    NO_BALANCE: 'No balance left — please contact the administrator',
    INVALID_PC_KEY: 'Invalid PC key (check settings)',
    PC_NOT_FOUND: 'This PC number is not registered',
    ALREADY_LOGGED_IN_ELSEWHERE: 'User is already logged in on another PC',
    INVALID_SESSION_TOKEN: 'Session expired',
    INVALID_DATE_RANGE: 'Invalid date range',
    GAME_NOT_FOUND: 'Game not found',
    GAME_LAUNCH_CONFIG_INVALID: 'Invalid launch settings: STEAM needs a Steam App ID, EXE a file path, URL a link',
  },
};

export const endReasonLabels: Record<Lang, Record<SessionEndReason, string>> = {
  ka: {
    LOGOUT: 'გამოსვლ',
    BALANCE_DEPLETED: 'ბალანსი ამოიწურ',
    TIMEOUT: 'კავშირი გაწყდ',
    ADMIN_FORCED: 'ადმინის მიერ',
    REPLACED: 'ჩანაცვლდ',
  },
  en: {
    LOGOUT: 'Logout',
    BALANCE_DEPLETED: 'Balance depleted',
    TIMEOUT: 'Connection lost',
    ADMIN_FORCED: 'By admin',
    REPLACED: 'Replaced',
  },
};

export const transactionTypeLabels: Record<Lang, Record<TransactionType, string>> = {
  ka: { TOPUP: 'შევსებ', DEDUCTION: 'ჩამოჭრ', SESSION_CHARGE: 'სესი' },
  en: { TOPUP: 'Top-up', DEDUCTION: 'Deduction', SESSION_CHARGE: 'Session' },
};

export const alertTypeLabels: Record<Lang, Record<AlertType, string>> = {
  ka: { LOW_BALANCE: 'ბალანსი იწურებ', BALANCE_DEPLETED: 'ბალანსი ამოიწურ' },
  en: { LOW_BALANCE: 'Low balance', BALANCE_DEPLETED: 'Balance depleted' },
};

export function errorMessage(code: string | undefined, lang: Lang, fallback?: string): string {
  return (code && errorMessages[lang][code]) || fallback || errorMessages[lang].INTERNAL;
}
