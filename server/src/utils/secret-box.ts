import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM envelope for genuinely sensitive secrets at rest, ported
// from Kitchen ERP's common/crypto/secret-box.ts (same format, so the
// two products stay mentally interchangeable): "{iv}:{authTag}:{data}",
// each base64, under a single env-provided key. Deliberately NOT a
// general "encrypt this column" habit — used only for delivered Core
// sync credentials today.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function key(): Buffer {
  const keyBytes = Buffer.from(process.env.CORE_SYNC_CREDENTIAL_KEY ?? "", "base64");
  if (keyBytes.length !== 32) {
    throw new Error("CORE_SYNC_CREDENTIAL_KEY must decode to exactly 32 bytes");
  }
  return keyBytes;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed secret-box payload");
  }

  const [iv, authTag, data] = parts.map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
