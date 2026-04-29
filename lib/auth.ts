import {
  getTenantRecordByHashedKey,
  hashApiKey,
  resolveTenant,
  TenantRecord,
  touchTenant,
} from "@/lib/tenant";

export class ApiKeyAuthError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiKeyAuthError";
  }
}

export function isApiKeyAuthError(error: unknown): error is ApiKeyAuthError {
  return error instanceof ApiKeyAuthError;
}

export async function resolveTenantFromRequest(req: Request): Promise<TenantRecord> {
  const rawApiKey = req.headers.get("x-api-key");

  if (!rawApiKey) {
    throw new ApiKeyAuthError(401, "API key required");
  }

  const hashedKey = hashApiKey(rawApiKey);
  const storedRecord = await getTenantRecordByHashedKey(hashedKey);

  if (!storedRecord) {
    throw new ApiKeyAuthError(401, "Invalid API key");
  }

  if (storedRecord.status === "revoked") {
    throw new ApiKeyAuthError(403, "API key revoked");
  }

  const tenantRecord = await resolveTenant(rawApiKey);
  if (!tenantRecord) {
    throw new ApiKeyAuthError(401, "Invalid API key");
  }

  await touchTenant(hashedKey);
  return tenantRecord;
}
