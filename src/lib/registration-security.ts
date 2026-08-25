export const REGISTRATION_IP_LIMIT_PER_HOUR = 10;
export const REGISTRATION_EMAIL_LIMIT_PER_DAY = 5;

export function hasExceededRegistrationThrottle(ipAttempts: number, emailAttempts: number) {
  return ipAttempts >= REGISTRATION_IP_LIMIT_PER_HOUR
    || emailAttempts >= REGISTRATION_EMAIL_LIMIT_PER_DAY;
}
