import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { redis } from "@/lib/redis";

export type TenantStatus = "active" | "revoked";

type TenantStoredRecord = {
  tenantId: string;
  hashedKey: string;
  status: TenantStatus;
  smsGateLogin: string;
  smsGatePassword: string;
  smsGateUrl: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type TenantRecord = {
  tenantId: string;
  hashedKey: string;
  status: TenantStatus;
  smsGateLogin: string;
  smsGatePassword: string;
  smsGateUrl: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type TenantSummary = {
  tenantId: string;
  status: TenantStatus;
  smsGateUrl: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const TENANT_KEY_PREFIX = "tenant:key:";
const TENANT_ID_PREFIX = "tenant:id:";
const TENANT_INDEX_KEY = "tenant:index";
const IV_BYTE_LENGTH = 12;

function getTenantKey(hashedKey: string): string {
  return `${TENANT_KEY_PREFIX}${hashedKey}`;
}

function getTenantIdKey(tenantId: string): string {
  return `${TENANT_ID_PREFIX}${tenantId}`;
}

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("Missing ENCRYPTION_KEY environment variable");
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string");
  }

  return Buffer.from(keyHex, "hex");
}

function encryptSecret(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptSecret(payload: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function generateTenantId(): string {
  return `tenant_${randomBytes(6).toString("hex")}`;
}

function validateCredentials(credentials: {
  smsGateLogin: string;
  smsGatePassword: string;
  smsGateUrl: string;
}): void {
  if (!credentials.smsGateLogin.trim() || !credentials.smsGatePassword.trim() || !credentials.smsGateUrl.trim()) {
    throw new Error("Missing tenant credentials");
  }
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function getTenantRecordByHashedKey(hashedKey: string): Promise<TenantStoredRecord | null> {
  return await redis.get<TenantStoredRecord>(getTenantKey(hashedKey));
}

export async function createTenant(credentials: {
  smsGateLogin: string;
  smsGatePassword: string;
  smsGateUrl: string;
}): Promise<{ apiKey: string; tenantId: string }> {
  validateCredentials(credentials);

  const login = credentials.smsGateLogin.trim();
  const password = credentials.smsGatePassword.trim();
  const url = credentials.smsGateUrl.trim();

  let tenantId = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateTenantId();
    const existingHash = await redis.get<string>(getTenantIdKey(candidate));
    if (!existingHash) {
      tenantId = candidate;
      break;
    }
  }

  if (!tenantId) {
    throw new Error("Failed to allocate tenant id");
  }

  let apiKey = "";
  let hashedKey = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rawKey = randomBytes(32).toString("hex");
    const hash = hashApiKey(rawKey);
    const existing = await getTenantRecordByHashedKey(hash);
    if (!existing) {
      apiKey = rawKey;
      hashedKey = hash;
      break;
    }
  }

  if (!apiKey || !hashedKey) {
    throw new Error("Failed to allocate API key");
  }

  const now = new Date().toISOString();
  const storedRecord: TenantStoredRecord = {
    tenantId,
    hashedKey,
    status: "active",
    smsGateLogin: encryptSecret(login),
    smsGatePassword: encryptSecret(password),
    smsGateUrl: url,
    createdAt: now,
    lastUsedAt: null,
  };

  await redis.set(getTenantKey(hashedKey), storedRecord);
  await redis.set(getTenantIdKey(tenantId), hashedKey);
  await redis.sadd(TENANT_INDEX_KEY, tenantId);

  return { apiKey, tenantId };
}

export async function resolveTenant(rawApiKey: string): Promise<TenantRecord | null> {
  if (!rawApiKey) {
    return null;
  }

  const hashedKey = hashApiKey(rawApiKey);
  const storedRecord = await getTenantRecordByHashedKey(hashedKey);

  if (!storedRecord || storedRecord.status !== "active") {
    return null;
  }

  return {
    ...storedRecord,
    smsGateLogin: decryptSecret(storedRecord.smsGateLogin),
    smsGatePassword: decryptSecret(storedRecord.smsGatePassword),
  };
}

export async function revokeTenant(tenantId: string): Promise<void> {
  const hashedKey = await redis.get<string>(getTenantIdKey(tenantId));
  if (!hashedKey) {
    return;
  }

  const storedRecord = await getTenantRecordByHashedKey(hashedKey);
  if (!storedRecord || storedRecord.status === "revoked") {
    return;
  }

  await redis.set(getTenantKey(hashedKey), {
    ...storedRecord,
    status: "revoked",
  });
}

export async function rotateTenantKey(tenantId: string, rawOldKey: string): Promise<{ apiKey: string }> {
  const mappedHash = await redis.get<string>(getTenantIdKey(tenantId));
  if (!mappedHash) {
    throw new Error("Tenant not found");
  }

  const oldHash = hashApiKey(rawOldKey);
  if (oldHash !== mappedHash) {
    throw new Error("Invalid API key");
  }

  const oldRecord = await getTenantRecordByHashedKey(oldHash);
  if (!oldRecord || oldRecord.status !== "active") {
    throw new Error("Invalid API key");
  }

  let newApiKey = "";
  let newHash = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateRawKey = randomBytes(32).toString("hex");
    const candidateHash = hashApiKey(candidateRawKey);
    const existing = await getTenantRecordByHashedKey(candidateHash);
    if (!existing) {
      newApiKey = candidateRawKey;
      newHash = candidateHash;
      break;
    }
  }

  if (!newApiKey || !newHash) {
    throw new Error("Failed to rotate API key");
  }

  await redis.set(getTenantKey(newHash), {
    ...oldRecord,
    hashedKey: newHash,
    status: "active",
    lastUsedAt: null,
  });

  await redis.set(getTenantKey(oldHash), {
    ...oldRecord,
    status: "revoked",
  });

  await redis.set(getTenantIdKey(tenantId), newHash);

  return { apiKey: newApiKey };
}

export async function touchTenant(hashedKey: string): Promise<void> {
  const storedRecord = await getTenantRecordByHashedKey(hashedKey);
  if (!storedRecord) {
    return;
  }

  await redis.set(getTenantKey(hashedKey), {
    ...storedRecord,
    lastUsedAt: new Date().toISOString(),
  });
}

export async function listTenantSummaries(): Promise<TenantSummary[]> {
  const tenantIds = (await redis.smembers<string[]>(TENANT_INDEX_KEY)) ?? [];
  const summaries: TenantSummary[] = [];

  for (const tenantId of tenantIds) {
    const hashedKey = await redis.get<string>(getTenantIdKey(tenantId));
    if (!hashedKey) {
      continue;
    }

    const record = await getTenantRecordByHashedKey(hashedKey);
    if (!record) {
      continue;
    }

    summaries.push({
      tenantId: record.tenantId,
      status: record.status,
      smsGateUrl: record.smsGateUrl,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    });
  }

  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
