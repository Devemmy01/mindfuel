// Constants and pure helpers shared between the browser (setup — encrypts
// the backup with a key derived from the user's PIN) and the server (restore
// — decrypts it) so the two sides can never drift out of sync on the KDF
// parameters or PIN format.

export const RECOVERY_PIN_MIN_LENGTH = 6;
export const RECOVERY_PIN_MAX_LENGTH = 10;
export const RECOVERY_ITERATIONS = 210_000;
export const MAX_RECOVERY_ATTEMPTS = 5;

export function normalizeRecoveryPin(input: string) {
  return input.replace(/\D/g, "");
}

export function isValidRecoveryPin(input: string) {
  const normalized = normalizeRecoveryPin(input);
  return normalized.length >= RECOVERY_PIN_MIN_LENGTH && normalized.length <= RECOVERY_PIN_MAX_LENGTH;
}
