import { describe, expect, it } from "vitest";
import { isValidRecoveryPin, normalizeRecoveryPin, RECOVERY_PIN_MAX_LENGTH, RECOVERY_PIN_MIN_LENGTH } from "./chat-recovery-shared";

describe("normalizeRecoveryPin", () => {
  it("strips everything but digits", () => {
    expect(normalizeRecoveryPin("482-913")).toBe("482913");
  });

  it("strips whitespace and other stray characters a user might type", () => {
    expect(normalizeRecoveryPin(" 482 913 ")).toBe("482913");
  });

  it("is idempotent so an already-clean PIN still matches", () => {
    expect(normalizeRecoveryPin(normalizeRecoveryPin("482913"))).toBe("482913");
  });
});

describe("isValidRecoveryPin", () => {
  it(`rejects PINs shorter than ${RECOVERY_PIN_MIN_LENGTH} digits`, () => {
    expect(isValidRecoveryPin("12345")).toBe(false);
  });

  it(`accepts PINs from ${RECOVERY_PIN_MIN_LENGTH} to ${RECOVERY_PIN_MAX_LENGTH} digits`, () => {
    expect(isValidRecoveryPin("123456")).toBe(true);
    expect(isValidRecoveryPin("1234567890")).toBe(true);
  });

  it(`rejects PINs longer than ${RECOVERY_PIN_MAX_LENGTH} digits`, () => {
    expect(isValidRecoveryPin("12345678901")).toBe(false);
  });

  it("ignores separators when checking length", () => {
    expect(isValidRecoveryPin("482-913")).toBe(true);
  });
});
