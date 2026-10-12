import crypto from "crypto";

// Ambiguous characters (0/O, 1/l/I) are left out so the password is easy to type from an email.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

const pick = (chars) => chars[crypto.randomInt(chars.length)];

/**
 * Generate a temporary password using a CSPRNG.
 * Always contains at least one upper, lower, digit and symbol.
 * @param {number} length - Password length (min 12)
 * @returns {string}
 */
export const generateTemporaryPassword = (length = 14) => {
  const size = Math.max(12, length);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) chars.push(pick(ALL));

  // Fisher-Yates shuffle so the guaranteed classes aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
