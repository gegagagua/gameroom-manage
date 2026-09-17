import { errorMessage, type Lang } from '@grm/shared';
import { useCallback } from 'react';

const ka = {
  brand: 'GAME ROOM',
  'pc.label': 'PC #{n}',
  'pc.unassigned': 'PC —',
  'status.online': 'ონლაინ',
  'status.offline': 'ოფლაინ',

  'login.title': 'შესვლ',
  'login.subtitle': 'შედით ანგარიშზ, რომ დაიწყოს დროის ათვლ',
  'login.login': 'ელ. ფოსტ ან ტელეფონ',
  'login.password': 'პაროლ',
  'login.submit': 'შესვლ',
  'login.submitting': 'შესვლა…',
  'login.resuming': 'სესიის აღდგენ…',
  'login.offline': 'სერვერთან კავშირი არ არ',
  'login.help': 'ბალანსის შესასვლად მიმართეთ ადმინისტრატორ',
  'login.settings': 'პარამეტრებ',

  'session.hello': 'გამარჯობ, {name}',
  'session.remaining': 'დარჩენილი დრო',
  'session.approxHours': '≈ {h} სთ',
  'session.started': 'დაწყებ',
  'session.elapsed': 'სესიის ხანგრძლივობ',
  'session.pc': 'კომპიუტერ',
  'session.logout': 'გამოსვლ',
  'session.logoutConfirm': 'დააჭირეთ ხელახლ გამოსვლისთვ',
  'session.offline': 'სერვერთან კავშირი დაკარგულია. თუ 3 წუთის განმავლობაში არ აღდგ, სესია ჩაიკეტებ.',
  'session.lowHint': 'დრო იწურებ — შეინახეთ თამაშ',

  'warning.LOW_5': 'დარჩა 5 წუთ',
  'warning.LOW_1': 'დარჩა 1 წუთ!',
  'warning.hint': 'შეინახეთ თამაშ. დროის დასამატებლად მიმართეთ ადმინისტრატორ.',

  'expired.title': 'დრო ამოიწურ',
  'expired.subtitle': 'თქვენ ბალანსი ამოიწურ. დროის დასამატებლად მიმართეთ ადმინისტრატორ.',
  'expired.shutdownIn': 'კომპიუტერი გაითიშვებ {s} წამშ',
  'expired.lockIn': 'ეკრანი ჩაიკეტებ {s} წამშ',
  'expired.dryRun': 'DEV რეჟიმ: რეალური გათიშვა არ მოხდებ',

  'message.ENDED': 'სესია დასრულდ',
  'message.COMMAND_LOGOUT': 'ადმინისტრატორმ დაასრული თქვენ სესი',
  'message.COMMAND_SHUTDOWN': 'ადმინისტრატორ გათიშავს კომპიუტერ',
  'message.OFFLINE': 'სერვერთან კავშირი დაკარგუდ — სესია ჩაიკეტ',
  'message.SESSION_INVALID': 'სესია ვადაგასულია — გთხოვთ, შედით ხელახლ',
  'message.TOPPED_UP': 'ბალანსი შეივს — გთხოვთ, შედით ხელახლ',
  'message.reason': 'მიზეზ: {reason}',
  'message.shutdownIn': 'გათიშვ {s} წამშ',
  'message.ok': 'კარგ',

  'notice.DRY_RUN_SHUTDOWN': 'DEV რეჟიმ: კომპიუტერის გათიშვა გამოტოვებულ (dry-run)',
  'notice.SHUTDOWN_FAILED': 'კომპიუტერის გათიშვა ვერ მოხერხდ',

  'settings.title': 'პარამეტრებ',
  'settings.firstRun': 'პირველი გაშვებ — მიუთითეთ სერვერი და PC-ის ნომერ',
  'settings.unlockTitle': 'ადმინისტრატორის ავტორიზაცი',
  'settings.unlockHint': 'პარამეტრების შესასვლად შეიყვანეთ ადმინის ელ. ფოსტ და პაროლ',
  'settings.email': 'ელ. ფოსტ',
  'settings.password': 'პაროლ',
  'settings.unlock': 'გახსნ',
  'settings.apiUrl': 'სერვერის მისამარ (API URL)',
  'settings.apiUrlHint': 'მაგ. https://gameroom.ge ან http://192.168.1.10:4000',
  'settings.pcNumber': 'PC-ის ნომერ',
  'settings.pcKey': 'PC გასაღებ (PC_AGENT_KEY)',
  'settings.show': 'ჩვენებ',
  'settings.hide': 'დამალვ',
  'settings.language': 'ენ',
  'settings.shutdownOnExpire': 'დროს ამოწურვისას კომპიუტერის გათიშვ',
  'settings.shutdownDelay': 'დაყოვნებ ამოწურვის შემდეგ (წამ)',
  'settings.autoStart': 'ავტომატური გაშვებ სისტემის ჩართვისას',
  'settings.test': 'კავშირის შემოწმებ',
  'settings.testOk': 'კავშირი OK — {name}',
  'settings.save': 'შენახვ',
  'settings.saved': 'შენახულ',
  'settings.close': 'დახურვ',
  'settings.quit': 'აპლიკაციდან გამოსვლ',
  'settings.envOverrides': 'გარემოს ცვლადებ ({vars}) ჩანაცვლებენ შენახულ მნიშნელობებ',
  'settings.configPath': 'კონფიგურაციის ფაილ',
  'settings.devBuild': 'DEV build — გათიშვა dry-run რეჟიმში',

  'error.INVALID_API_URL': 'მიუთითეთ სწორი URL (http:// ან https://)',
  'error.INVALID_PC_NUMBER': 'PC-ის ნომერი უნდ იყოს 1-დან 10-მდ',
  'error.INVALID_PC_KEY_EMPTY': 'PC გასაღებ აუცილებელია',
  'error.INVALID_SHUTDOWN_DELAY': 'დაყოვნებ: 5–600 წამ',
  'error.NOT_CONFIGURED': 'PC არ არის კონფიგურირებულ',
  'error.BUSY': 'ოპერაცია ამ მომენტში შეუძლებელია',
  'games.title': 'თამაშებ',
  'games.loading': 'ბიბლიოთეკა იტვირთებ…',
  'games.cached': 'შენახული სია (სერვერი მიუწვდომელია)',
  'games.empty': 'თამაშები არ არის დამატებულ',
  'mini.games': 'თამაშებ',
  'mini.confirm': 'კიდევ ერთხელ',
  'notice.DRY_RUN_LAUNCH': 'DEV: „{name}“ გაშვება dry-run',
  'error.GAME_NOT_INSTALLED': 'თამაში ამ კომპიუტერზ არ არის დაინსტალირებულ',
  'error.GAME_LAUNCH_FAILED': 'თამაშის გაშვება ვერ მოხერხდ',
} as const;

export type Key = keyof typeof ka;

const en: Record<Key, string> = {
  brand: 'GAME ROOM',
  'pc.label': 'PC #{n}',
  'pc.unassigned': 'PC —',
  'status.online': 'Online',
  'status.offline': 'Offline',

  'login.title': 'Sign in',
  'login.subtitle': 'Sign in to start your time',
  'login.login': 'Email or phone',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.resuming': 'Restoring session…',
  'login.offline': 'No connection to the server',
  'login.help': 'Ask the administrator to top up your balance',
  'login.settings': 'Settings',

  'session.hello': 'Hi, {name}',
  'session.remaining': 'Time left',
  'session.approxHours': '≈ {h} h',
  'session.started': 'Started',
  'session.elapsed': 'Session length',
  'session.pc': 'Computer',
  'session.logout': 'Log out',
  'session.logoutConfirm': 'Press again to log out',
  'session.offline': 'Connection to the server lost. If it is not restored within 3 minutes the session will lock.',
  'session.lowHint': 'Time is running out — save your game',

  'warning.LOW_5': '5 minutes left',
  'warning.LOW_1': '1 minute left!',
  'warning.hint': 'Save your game. Ask the administrator to add time.',

  'expired.title': 'Time is up',
  'expired.subtitle': 'Your balance has run out. Ask the administrator to add time.',
  'expired.shutdownIn': 'The computer will shut down in {s} s',
  'expired.lockIn': 'The screen will lock in {s} s',
  'expired.dryRun': 'DEV mode: no real shutdown will happen',

  'message.ENDED': 'Session ended',
  'message.COMMAND_LOGOUT': 'The administrator ended your session',
  'message.COMMAND_SHUTDOWN': 'The administrator is shutting down this computer',
  'message.OFFLINE': 'Connection lost — the session was locked',
  'message.SESSION_INVALID': 'Session expired — please sign in again',
  'message.TOPPED_UP': 'Balance was topped up — please sign in again',
  'message.reason': 'Reason: {reason}',
  'message.shutdownIn': 'Shutting down in {s} s',
  'message.ok': 'OK',

  'notice.DRY_RUN_SHUTDOWN': 'DEV mode: shutdown skipped (dry-run)',
  'notice.SHUTDOWN_FAILED': 'Could not shut down the computer',

  'settings.title': 'Settings',
  'settings.firstRun': 'First run — set the server and the PC number',
  'settings.unlockTitle': 'Administrator sign-in',
  'settings.unlockHint': 'Enter the admin email and password to change settings',
  'settings.email': 'Email',
  'settings.password': 'Password',
  'settings.unlock': 'Unlock',
  'settings.apiUrl': 'Server address (API URL)',
  'settings.apiUrlHint': 'e.g. https://gameroom.ge or http://192.168.1.10:4000',
  'settings.pcNumber': 'PC number',
  'settings.pcKey': 'PC key (PC_AGENT_KEY)',
  'settings.show': 'Show',
  'settings.hide': 'Hide',
  'settings.language': 'Language',
  'settings.shutdownOnExpire': 'Shut the computer down when time runs out',
  'settings.shutdownDelay': 'Delay after time runs out (seconds)',
  'settings.autoStart': 'Start automatically when the system starts',
  'settings.test': 'Test connection',
  'settings.testOk': 'Connection OK — {name}',
  'settings.save': 'Save',
  'settings.saved': 'Saved',
  'settings.close': 'Close',
  'settings.quit': 'Quit application',
  'settings.envOverrides': 'Environment variables ({vars}) override saved values',
  'settings.configPath': 'Config file',
  'settings.devBuild': 'DEV build — shutdown runs in dry-run mode',

  'error.INVALID_API_URL': 'Enter a valid URL (http:// or https://)',
  'error.INVALID_PC_NUMBER': 'PC number must be between 1 and 10',
  'error.INVALID_PC_KEY_EMPTY': 'PC key is required',
  'error.INVALID_SHUTDOWN_DELAY': 'Delay: 5–600 seconds',
  'error.NOT_CONFIGURED': 'This PC is not configured',
  'error.BUSY': 'Not possible right now',
  'games.title': 'Games',
  'games.loading': 'Loading library…',
  'games.cached': 'Cached list (server unreachable)',
  'games.empty': 'No games have been added',
  'mini.games': 'Games',
  'mini.confirm': 'Press again',
  'notice.DRY_RUN_LAUNCH': 'DEV: "{name}" launch dry-run',
  'error.GAME_NOT_INSTALLED': 'This game is not installed on this computer',
  'error.GAME_LAUNCH_FAILED': 'Could not launch the game',
};

const dictionaries: Record<Lang, Record<Key, string>> = { ka, en };

export type Translate = (key: Key, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let text = dictionaries[lang][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

export function useT(lang: Lang): Translate {
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}

/** Local (desktop) error codes first, then API error codes from @grm/shared. */
export function errorText(code: string, lang: Lang, details?: unknown): string {
  const localKey = `error.${code}` as Key;
  if (localKey in ka) return translate(lang, localKey);
  const msg = errorMessage(code, lang);
  const pcNumber = (details as { pcNumber?: number } | undefined)?.pcNumber;
  return code === 'ALREADY_LOGGED_IN_ELSEWHERE' && pcNumber ? `${msg} (PC #${pcNumber})` : msg;
}
