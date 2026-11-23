import type { AlertType, SessionEndReason, TransactionType } from './types';

export type Lang = 'ka' | 'en' | 'ru';
export const LANGS: Lang[] = ['ka', 'en', 'ru'];
export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** Compact label for language switches and the full language name. */
export const langShortLabels: Record<Lang, string> = { ka: 'ქარ', en: 'EN', ru: 'РУ' };
export const langNames: Record<Lang, string> = { ka: 'ქართული', en: 'English', ru: 'Русский' };

/** Short "hours" unit: სთ / h / ч */
export const hourUnit: Record<Lang, string> = { ka: 'სთ', en: 'h', ru: 'ч' };

/** Error codes returned by the API (see apps/api/src/common/api-error.ts). */
export const errorMessages: Record<Lang, Record<string, string>> = {
  ka: {
    VALIDATION_FAILED: 'შეყვანილი მონაცემები არასწორია',
    UNAUTHORIZED: 'საჭიროა ავტორიზაცია',
    FORBIDDEN: 'წვდომა აკრძალულია',
    NOT_FOUND: 'არ მოიძებნა',
    CONFLICT: 'ჩანაწერი უკვე არსებობს',
    TOO_MANY_REQUESTS: 'მეტისმეტად ბევრი მცდელობა — სცადეთ მოგვიანებით',
    INTERNAL: 'სერვერის შეცდომა',
    NETWORK: 'სერვერთან კავშირი ვერ მოხერხდა',
    INVALID_CREDENTIALS: 'მომხმარებელი ან პაროლი არასწორია',
    WRONG_CURRENT_PASSWORD: 'მიმდინარე პაროლი არასწორია',
    INVALID_RESET_TOKEN: 'ბმული არასწორია ან ვადაგასულია',
    USER_INACTIVE: 'მომხმარებელი დეაქტივირებულია',
    EMAIL_TAKEN: 'ეს ელ. ფოსტა უკვე გამოყენებულია',
    PHONE_TAKEN: 'ეს ტელეფონის ნომერი უკვე გამოყენებულია',
    USERNAME_TAKEN: 'ეს მომხმარებლის სახელი უკვე დაკავებულია',
    USER_NOT_FOUND: 'მომხმარებელი არ მოიძებნა',
    USER_HAS_ACTIVE_SESSION: 'მომხმარებელს აქვს აქტიური სესია',
    INSUFFICIENT_BALANCE: 'ბალანსი არასაკმარისია',
    NO_BALANCE: 'ბალანსი ცარიელია — მიმართეთ ადმინისტრატორს',
    INVALID_PC_KEY: 'PC-ის გასაღები არასწორია (შეამოწმეთ პარამეტრები)',
    PC_NOT_FOUND: 'ამ ნომრის PC არ არის რეგისტრირებული',
    ALREADY_LOGGED_IN_ELSEWHERE: 'მომხმარებელი უკვე შესულია სხვა PC-ზე',
    INVALID_SESSION_TOKEN: 'სესიას ვადა გაუვიდა',
    PC_BUSY: 'ამ PC-ზე უკვე მიმდინარეობს სესია',
    NO_ACTIVE_SESSION: 'ამ PC-ზე აქტიური სესია არ არის',
    INVALID_DATE_RANGE: 'თარიღების დიაპაზონი არასწორია',
    GAME_NOT_FOUND: 'თამაში არ მოიძებნა',
    GAME_LAUNCH_CONFIG_INVALID: 'გაშვების პარამეტრები არასწორია: STEAM → Steam App ID, EXE → ფაილის მისამართი, URL → ბმული',
    BOOKING_NOT_FOUND: 'ჯავშანი არ მოიძებნა',
    BOOKING_CONFLICT: 'ამ დროს მოწყობილობა უკვე დაჯავშნილია',
    BOOKING_INVALID_TIME: 'დრო არასწორია: 14:00–02:00, 30-წუთიანი ბიჯით',
    BOOKING_IN_PAST: 'წარსულ დროზე ჯავშნის გაკეთება შეუძლებელია',
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
    PC_BUSY: 'This PC already has a session',
    NO_ACTIVE_SESSION: 'This PC has no active session',
    INVALID_DATE_RANGE: 'Invalid date range',
    GAME_NOT_FOUND: 'Game not found',
    GAME_LAUNCH_CONFIG_INVALID: 'Invalid launch settings: STEAM needs a Steam App ID, EXE a file path, URL a link',
    BOOKING_NOT_FOUND: 'Booking not found',
    BOOKING_CONFLICT: 'A device is already booked at this time',
    BOOKING_INVALID_TIME: 'Invalid time: 14:00–02:00 in 30-minute steps',
    BOOKING_IN_PAST: 'Cannot book a time in the past',
  },
  ru: {
    VALIDATION_FAILED: 'Введены неверные данные',
    UNAUTHORIZED: 'Требуется авторизация',
    FORBIDDEN: 'Доступ запрещён',
    NOT_FOUND: 'Не найдено',
    CONFLICT: 'Такая запись уже существует',
    TOO_MANY_REQUESTS: 'Слишком много попыток — повторите позже',
    INTERNAL: 'Ошибка сервера',
    NETWORK: 'Не удалось подключиться к серверу',
    INVALID_CREDENTIALS: 'Неверный логин или пароль',
    WRONG_CURRENT_PASSWORD: 'Неверный текущий пароль',
    INVALID_RESET_TOKEN: 'Ссылка недействительна или устарела',
    USER_INACTIVE: 'Пользователь деактивирован',
    EMAIL_TAKEN: 'Эта эл. почта уже используется',
    PHONE_TAKEN: 'Этот номер телефона уже используется',
    USERNAME_TAKEN: 'Это имя пользователя уже занято',
    USER_NOT_FOUND: 'Пользователь не найден',
    USER_HAS_ACTIVE_SESSION: 'У пользователя есть активный сеанс',
    INSUFFICIENT_BALANCE: 'Недостаточно средств на балансе',
    NO_BALANCE: 'Баланс пуст — обратитесь к администратору',
    INVALID_PC_KEY: 'Неверный ключ PC (проверьте настройки)',
    PC_NOT_FOUND: 'PC с таким номером не зарегистрирован',
    ALREADY_LOGGED_IN_ELSEWHERE: 'Пользователь уже вошёл на другом PC',
    INVALID_SESSION_TOKEN: 'Сеанс истёк',
    PC_BUSY: 'На этом PC уже идёт сеанс',
    NO_ACTIVE_SESSION: 'На этом PC нет активного сеанса',
    INVALID_DATE_RANGE: 'Неверный диапазон дат',
    GAME_NOT_FOUND: 'Игра не найдена',
    GAME_LAUNCH_CONFIG_INVALID: 'Неверные параметры запуска: STEAM → Steam App ID, EXE → путь к файлу, URL → ссылка',
    BOOKING_NOT_FOUND: 'Бронь не найдена',
    BOOKING_CONFLICT: 'Устройство в это время уже забронировано',
    BOOKING_INVALID_TIME: 'Неверное время: 14:00–02:00, шаг 30 минут',
    BOOKING_IN_PAST: 'Нельзя забронировать прошедшее время',
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
  ru: {
    LOGOUT: 'Выход',
    BALANCE_DEPLETED: 'Баланс исчерпан',
    TIMEOUT: 'Связь потеряна',
    ADMIN_FORCED: 'Администратором',
    REPLACED: 'Заменён',
  },
};

export const transactionTypeLabels: Record<Lang, Record<TransactionType, string>> = {
  ka: { TOPUP: 'შევსება', DEDUCTION: 'ჩამოჭრა', SESSION_CHARGE: 'სესია' },
  en: { TOPUP: 'Top-up', DEDUCTION: 'Deduction', SESSION_CHARGE: 'Session' },
  ru: { TOPUP: 'Пополнение', DEDUCTION: 'Списание', SESSION_CHARGE: 'Сеанс' },
};

export const alertTypeLabels: Record<Lang, Record<AlertType, string>> = {
  ka: { LOW_BALANCE: 'ბალანსი იწურება', BALANCE_DEPLETED: 'ბალანსი ამოიწურა' },
  en: { LOW_BALANCE: 'Low balance', BALANCE_DEPLETED: 'Balance depleted' },
  ru: { LOW_BALANCE: 'Баланс заканчивается', BALANCE_DEPLETED: 'Баланс исчерпан' },
};

export function errorMessage(code: string | undefined, lang: Lang, fallback?: string): string {
  return (code && errorMessages[lang][code]) || fallback || errorMessages[lang].INTERNAL;
}
