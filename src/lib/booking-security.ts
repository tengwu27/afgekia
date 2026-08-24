export const BOOKING_RATE_LIMIT = 3;

export function hasExceededBookingThrottle(recentRequestCount: number, limit = BOOKING_RATE_LIMIT) {
  return recentRequestCount >= limit;
}
