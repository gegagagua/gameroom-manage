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
    CONFLICT: 'კონფლიქტ — ჩანაწერი უკვე არსებობს',
    TOO_MANY_REQUESTS: 'ზედმეტად ბევრი მცდელობა, სცადეთ მოგვიანებით',
    INTERNAL: 'სერვერის შეცდომა',
    NETWORK: 'სერვერთან კავშირი ვერ მოხერხდა',
    INVALID_CREDENTIALS: 'არასწორი მომხმარებელი ან პაროლი',
    WRONG_CURRENT_PASSWORD: 'მიმდინარე პაროლი არასწორია',
    INVALID_RESET_TOKEN: 'ბმული არასწორია ან ვადაგასულია',
    USER_INACTIVE: 'მომხმარებელი დეაქტივირებულია',
    EMAIL_TAKEN: 'ეს ელ. ფოსტა უკვე გამოყენებულია',
    PHONE_TAKEN: 'ეს ტელეფონი უკვე გამოყენებულია',
    USERNAME_TAKEN: 'ეს იუზერნეიმი უკვე დაკავებულია',
    USER_NOT_FOUND: 'მომხმარებელი არ მოიძებნა',
    USER_HAS_ACTIVE_SESSION: 'მომხმარებელს აქვს აქტიური სესია',
    INSUFFICIENT_BALANCE: 'ბალანსი არ არის საკმარისი',
    NO_BALANCE: 'ბალანსი ცარიელია — მიმართეთ ადმინისტრატორს',
    INVALID_PC_KEY: 'PC-ის გასაღები არასწორია (შეამოწმეთ პარამეტრები)',
    PC_NOT_FOUND: 'ეს PC ნომერი არ არის რეგისტრირებული',
    ALREADY_LOGGED_IN_ELSEWHERE: 'მომხმარებელი უკვე შესულია სხვა PC-ზე',
    INVALID_SESSION_TOKEN: 'სესია ვადაგასულია',
    INVALID_DATE_RANGE: 'თარიღების დიაპაზონი არასწორია',
    GAME_NOT_FOUND: 'თამაში არ მოიძებნა',
    GAME_LAUNCH_CONFIG_INVALID: 'გაშვების პარამეტრები არასწორია: STEAM → Steam App ID, EXE → ფაილის მისამარი, URL → ბმული',
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
    USERNAME_TAKEN: 'This username is already taken',
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
    LOGOUT: 'გამოსვლა',
    BALANCE_DEPLETED: 'ბალანსი ამოიწურა',
    TIMEOUT: 'კავშირი გაწყდა',
    ADMIN_FORCED: 'ადმინის მიერ',
    REPLACED: 'ჩანაცვლდა',
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
  ka: { TOPUP: 'შევსება', DEDUCTION: 'ჩამოჭრა', SESSION_CHARGE: 'სესია' },
  en: { TOPUP: 'Top-up', DEDUCTION: 'Deduction', SESSION_CHARGE: 'Session' },
};

export const alertTypeLabels: Record<Lang, Record<AlertType, string>> = {
  ka: { LOW_BALANCE: 'ბალანსი იწურება', BALANCE_DEPLETED: 'ბალანსი ამოიწურა' },
  en: { LOW_BALANCE: 'Low balance', BALANCE_DEPLETED: 'Balance depleted' },
};

export function errorMessage(code: string | undefined, lang: Lang, fallback?: string): string {
  return (code && errorMessages[lang][code]) || fallback || errorMessages[lang].INTERNAL;
}
