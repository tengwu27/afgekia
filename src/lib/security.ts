import "server-only";

import { randomInt } from "node:crypto";

const READABLE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";

function randomCharacters(length: number, alphabet: string) {
  return Array.from(
    { length },
    () => alphabet[randomInt(0, alphabet.length)],
  ).join("");
}

export function generateTemporaryPassword() {
  return `Af7!${randomCharacters(18, PASSWORD_ALPHABET)}`;
}

export function generateBookingReference() {
  return `AF-${randomCharacters(8, READABLE_ALPHABET)}`;
}

export function generateProjectReference() {
  return `PRJ-${randomCharacters(6, READABLE_ALPHABET)}`;
}
