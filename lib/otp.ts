import crypto from "crypto";

export function generateOtp(): string {
  // Generates a 6-digit integer from 100000 to 999999 securely.
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOtp(otp: string): string {
  // Uses SHA-256 to hash the OTP securely so plain text isn't in Redis
  return crypto.createHash("sha256").update(otp).digest("hex");
}
