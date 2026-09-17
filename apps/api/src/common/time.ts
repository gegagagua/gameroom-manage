export const hoursToSeconds = (hours: number) => Math.round(hours * 3600);
export const secondsToHours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;
export const secondsBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / 1000);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Keeps a leading "+" and digits only: "+995 555-12-34-56" → "+995555123456". */
export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}
