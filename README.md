# SMS OTP Service

Multi-tenant OTP microservice built with Next.js App Router, Upstash Redis, and sms-gate.app.

Each API key owner brings their own sms-gate credentials:

1. Register credentials once.
2. Receive a one-time API key.
3. Use that key for send/verify.
4. OTP state is isolated per tenant in Redis.

## Key Behavior

1. OTP generation and hashing logic is unchanged.
2. OTP cooldown, inflight lock, attempts, and expiry are unchanged.
3. Auth is no longer a global API secret; it is per-tenant API key.
4. Global SMS gateway env credentials are removed; credentials are resolved from tenant key.

## Environment Variables

Copy .env.example to .env.local and set values.

| Variable | Required | Purpose |
|---|---|---|
| UPSTASH_REDIS_REST_URL | Yes | Upstash Redis REST URL |
| UPSTASH_REDIS_REST_TOKEN | Yes | Upstash Redis token |
| ENCRYPTION_KEY | Yes | 32-byte hex key for AES-256-GCM encrypt/decrypt of tenant SMS secrets |
| ADMIN_SECRET_KEY | Yes | Admin endpoint key for tenant listing |

Generate ENCRYPTION_KEY:

```bash
openssl rand -hex 32
```

## API Overview

### Public onboarding

1. POST /api/keys/register

### Tenant-authenticated endpoints (x-api-key)

1. GET /api/keys/me
2. POST /api/keys/rotate
3. POST /api/keys/revoke
4. POST /api/otp/send
5. POST /api/otp/verify

### Admin endpoint (x-admin-key)

1. GET /api/admin/tenants

## Integration Flow

1. Register tenant and save API key immediately (shown once).
2. Use x-api-key for OTP send/verify calls.
3. Rotate or revoke key as needed.

Note:
SMS quota, SIM health, and carrier behavior are determined by the tenant's own sms-gate account and device.

## cURL Examples

Set base URL:

```bash
BASE_URL="http://localhost:3000"
```

### 1) Register tenant key (public)

```bash
curl -X POST "$BASE_URL/api/keys/register" \
  -H "Content-Type: application/json" \
  -d '{
    "smsGateLogin": "your@email.com",
    "smsGatePassword": "yourpassword",
    "smsGateUrl": "https://api.sms-gate.app/3rdparty/v1/message"
  }'
```

Expected response:

```json
{
  "success": true,
  "apiKey": "<raw-api-key>",
  "tenantId": "tenant_xxxxx",
  "message": "Save your API key now. It will not be shown again."
}
```

### 2) Tenant profile

```bash
curl -X GET "$BASE_URL/api/keys/me" \
  -H "x-api-key: <raw-api-key>"
```

### 3) Send OTP

```bash
curl -X POST "$BASE_URL/api/otp/send" \
  -H "x-api-key: <raw-api-key>" \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+918329908401" }'
```

### 4) Verify OTP

```bash
curl -X POST "$BASE_URL/api/otp/verify" \
  -H "x-api-key: <raw-api-key>" \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+918329908401", "otp": "123456" }'
```

### 5) Rotate API key

```bash
curl -X POST "$BASE_URL/api/keys/rotate" \
  -H "x-api-key: <raw-api-key>"
```

Expected response includes new one-time API key and old key is immediately invalid.

### 6) Revoke API key

```bash
curl -X POST "$BASE_URL/api/keys/revoke" \
  -H "x-api-key: <raw-api-key>"
```

### 7) Admin tenant listing

```bash
curl -X GET "$BASE_URL/api/admin/tenants" \
  -H "x-admin-key: <admin-secret-key>"
```

Admin response is redacted and does not include credentials, key hashes, or raw API keys.

## Demo Page

The demo flow remains available at /demo.

Use a tenant API key in the demo key field before calling send/verify.

## Security Notes

1. Raw API keys are never stored in Redis.
2. smsGateLogin and smsGatePassword are encrypted with AES-256-GCM before storage.
3. Decrypted SMS credentials are used only at send time.
4. Do not expose tenant API keys in browser production flows; call endpoints from your backend when possible.
