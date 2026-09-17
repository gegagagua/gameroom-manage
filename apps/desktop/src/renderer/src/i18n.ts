import { errorMessage, type Lang } from '@grm/shared';
import { useCallback } from 'react';

const ka = {
  brand: 'GAME ROOM',
  'pc.label': 'PC #{n}',
  'pc.unassigned': 'PC —',
  'status.online': 'ონლაინ',
  'status.offline': 'ოფლაინ',

  'login.title': 'შესვლა',
  'login.subtitle': 'შედით ანგარიშზე, რომ დაიწყოს დროის ათვლა',
  'login.login': 'ელ. ფოსტა ან ტელეფონი',
  'login.password': 'პაროლი',
  'login.submit': 'შესვლა',
  'login.submitting': 'შესვლა…',
  'login.resuming': 'სესიის აღდგენა…',
  'login.offline': 'სერვერთან კავშირი არ არის',
  'login.help': 'ბალანსის შესასებად მიმართეთ ადმინისტრატორს',
  'login.settings': 'პარამეტრები',

  'session.hello': 'გამარჯობა, {name}',
  'session.remaining': 'დარჩენილი დრო',
  'session.approxHours': '≈ {h} სთ',
  'session.started': 'დაწყდა',
  'session.elapsed': 'სესიის ხანგრძლივობა',
  'session.pc': 'კომპიუტერი',
  'session.logout': 'გამოსვლა',
  'session.logoutConfirm': 'დააჭირეთ ხელახლა გამოსვლისთვის',
  'session.offline': 'სერვერთან კავშირი დაკარგულია. თუ 3 წუთის განმავლობაში არ აღდგა, სესია ჩაიკეტება.',
  'session.lowHint': 'დრო იწურება — შეინახეთ თამაში',

  'warning.LOW_5': 'დარჩა 5 წუთი',
  'warning.LOW_1': 'დარჩა 1 წუთი!',
  'warning.hint': 'შეინახეთ თამაში. დროის დასამატებლად მიმართეთ ადმინისტრატორს.',

  'expired.title': 'დრო ამოიწურა',
  'expired.subtitle': 'თქვენი ბალანსი ამოიწურა. დროის დასამატებლად მიმართეთ ადმინისტრატორს.',
  'expired.shutdownIn': 'კომპიუტერი გაითიშვება {s} წამში',
  'expired.lockIn': 'ეკრანი ჩაიკეტება {s} წამში',
  'expired.dryRun': 'DEV რეჟიმი: რეალური გათიშვა არ მოხდება',

  'message.ENDED': 'სესია დასრულდა',
  'message.COMMAND_LOGOUT': 'ადმინისტრატორმა დაასრულა თქვენი სესია',
  'message.COMMAND_SHUTDOWN': 'ადმინისტრატორი გათიშავს კომპიუტერს',
  'message.OFFLINE': 'სერვერთან კავშირი დაკარგუდა — სესია ჩაიკეტა',
  'message.SESSION_INVALID': 'სესია ვადაგასულია — გთხოვთ, შედით ხელახლა',
  'message.TOPPED_UP': 'ბალანსი შეივსა — გთხოვთ, შედით ხელახლა',
  'message.reason': 'მიზეზი: {reason}',
  'message.shutdownIn': 'გათიშვა {s} წამში',
  'message.ok': 'კარგი',

  'notice.DRY_RUN_SHUTDOWN': 'DEV რეჟიმი: კომპიუტერის გათიშვა გამოტოვებულია (dry-run)',
  'notice.SHUTDOWN_FAILED': 'კომპიუტერის გათიშვა ვერ მოხერხდა',

  'settings.title': 'პარამეტრები',
  'settings.firstRun': 'პირველი გაშვება — მიუთითეთ სერვერი და PC-ის ნომერი',
  'settings.unlockTitle': 'ადმინისტრატორის ავტორიზაცია',
  'settings.unlockHint': 'პარამეტრების შესასვლად შეიყვანეთ ადმინის ელ. ფოსტა და პაროლი',
  'settings.email': 'ელ. ფოსტა',
  'settings.password': 'პაროლი',
  'settings.unlock': 'გახსნა',
  'settings.apiUrl': 'სერვერის მისამარი (API URL)',
  'settings.apiUrlHint': 'მაგ. https://gameroom.ge ან http://192.168.1.10:4000',
  'settings.pcNumber': 'PC-ის ნომერი',
  'settings.pcKey': 'PC გასაღები (PC_AGENT_KEY)',
  'settings.show': 'ჩვენება',
  'settings.hide': 'დამალვა',
  'settings.language': 'ენა',
  'settings.shutdownOnExpire': 'დროის ამოწურვისას კომპიუტერის გათიშვა',
  'settings.shutdownDelay': 'დაყოვნება ამოწურვის შემდეგ (წამი)',
  'settings.autoStart': 'ავტომატური გაშვება სისტემის ჩართვისას',
  'settings.test': 'კავშირის შემოწმება',
  'settings.testOk': 'კავშირი OK — {name}',
  'settings.save': 'შენახვა',
  'settings.saved': 'შენახულია',
  'settings.close': 'დახურვა',
  'settings.quit': 'აპლიკაციდან გამოსვლა',
  'settings.envOverrides': 'გარემოს ცვლადები ({vars}) ჩანაცვლებენ შენახულ მნიშნელობებს',
  'settings.configPath': 'კონფიგურაციის ფაილი',
  'settings.devBuild': 'DEV build — გათიშვა dry-run რეჟიმში',

  'error.INVALID_API_URL': 'მიუთითეთ სწორი URL (http:// ან https://)',
  'error.INVALID_PC_NUMBER': 'PC-ის ნომერი უნდა იყოს 1-დან 10-მდე',
  'error.INVALID_PC_KEY_EMPTY': 'PC გასაღები აუცილებელია',
  'error.INVALID_SHUTDOWN_DELAY': 'დაყოვნება: 5–600 წამი',
  'error.NOT_CONFIGURED': 'PC არ არის კონფიგურირებული',
  'error.BUSY': 'ოპერაცია ამ მომენტში შეუძლებელია',
  'games.title': 'თამაშები',
  'games.loading': 'ბიბლიოთეკა იტვირთება…',
  'games.cached': 'შენახული სია (სერვერი მიუწვდომელია)',
  'games.empty': 'თამაშები არ არის დამატებული',
  'mini.games': 'თამაშები',
  'mini.confirm': 'კიდევ ერთხელ',
  'notice.DRY_RUN_LAUNCH': 'DEV: „{name}“ გაშვება dry-run',
  'error.GAME_NOT_INSTALLED': 'თამაში ამ კომპიუტერზე არ არის დაინსტალირებული',
  'error.GAME_LAUNCH_FAILED': 'თამაშის გაშვება ვერ მოხერხდა',
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
