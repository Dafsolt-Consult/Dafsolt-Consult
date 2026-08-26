import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box";

// Ported alongside secret-box.ts from Kitchen ERP's common/crypto/secret-box
// — same AES-256-GCM contract, same failure modes worth locking in.
describe("secret-box", () => {
  const validKey = Buffer.alloc(32, 7).toString("base64");
  const originalKey = process.env.CORE_SYNC_CREDENTIAL_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.CORE_SYNC_CREDENTIAL_KEY;
    else process.env.CORE_SYNC_CREDENTIAL_KEY = originalKey;
  });

  it("round-trips a plaintext through encrypt/decrypt", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = validKey;
    const plaintext = "delivered-password-123";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  it("produces distinct ciphertexts for the same plaintext (random IV)", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = validKey;
    expect(encryptSecret("same-input")).not.toBe(encryptSecret("same-input"));
  });

  it("never embeds the plaintext in the ciphertext", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = validKey;
    expect(encryptSecret("super-secret-password")).not.toContain("super-secret");
  });

  it("rejects keys that do not decode to exactly 32 bytes", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = Buffer.alloc(16, 1).toString("base64");
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
    expect(() => decryptSecret("a:b:c")).toThrow(/32 bytes/);
  });

  it("fails to decrypt with the wrong key (GCM auth tag)", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = validKey;
    const payload = encryptSecret("super-secret-password");

    process.env.CORE_SYNC_CREDENTIAL_KEY = Buffer.alloc(32, 9).toString("base64");
    expect(() => decryptSecret(payload)).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = validKey;
    const [iv, tag, data] = encryptSecret("super-secret-password").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 0xff;

    expect(() => decryptSecret(`${iv}:${tag}:${flipped.toString("base64")}`)).toThrow();
  });

  it("rejects malformed payloads", () => {
    process.env.CORE_SYNC_CREDENTIAL_KEY = validKey;
    expect(() => decryptSecret("not-a-valid-payload")).toThrow();
  });
});
