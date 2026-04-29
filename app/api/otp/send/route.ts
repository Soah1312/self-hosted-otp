import { NextResponse } from "next/server";
import { ApiKeyAuthError, resolveTenantFromRequest } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { generateOtp, hashOtp } from "@/lib/otp";
import {
  sendSms,
  SmsBlockedError,
  SmsCredentialError,
  SmsDeliveryError,
  SmsQuotaError,
} from "@/lib/sms";

const OTP_TTL = 300; // 5 minutes
const COOLDOWN_TTL = 60; // 60 seconds
const INFLIGHT_TTL = 15; // prevent duplicate concurrent sends

function mapAuthError(error: unknown): NextResponse | null {
  if (error instanceof ApiKeyAuthError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
  }

  return null;
}

function mapSmsError(error: unknown): NextResponse | null {
  if (error instanceof SmsCredentialError) {
    return NextResponse.json({ success: false, message: "Invalid SMS gateway credentials" }, { status: 401 });
  }

  if (error instanceof SmsQuotaError) {
    return NextResponse.json({ success: false, message: "SMS quota exhausted" }, { status: 402 });
  }

  if (error instanceof SmsBlockedError) {
    return NextResponse.json({ success: false, message: "SMS delivery blocked by carrier" }, { status: 503 });
  }

  if (error instanceof SmsDeliveryError) {
    return NextResponse.json({ success: false, message: "SMS delivery failed" }, { status: 500 });
  }

  return null;
}

export async function POST(req: Request) {
  let tenantRecord;

  try {
    tenantRecord = await resolveTenantFromRequest(req);
  } catch (error) {
    const authResponse = mapAuthError(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone = body?.phone;
    if (!phone || typeof phone !== "string" || !/^\+91\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Invalid phone number format" }, { status: 422 });
    }

    const cooldownKey = `otp:cooldown:${tenantRecord.tenantId}:${phone}`;
    const inflightKey = `otp:inflight:${tenantRecord.tenantId}:${phone}`;

    const inflightLock = await redis.set(inflightKey, "1", { nx: true, ex: INFLIGHT_TTL });
    if (inflightLock !== "OK") {
      return NextResponse.json(
        { success: false, message: "OTP request already in progress" },
        { status: 429 }
      );
    }

    // Atomically acquire cooldown to avoid duplicate sends in race conditions.
    const cooldownLock = await redis.set(cooldownKey, "1", { nx: true, ex: COOLDOWN_TTL });
    if (cooldownLock !== "OK") {
      const ttl = await redis.ttl(cooldownKey);
      return NextResponse.json({ success: false, message: "Resend cooldown active", retryAfter: ttl }, { status: 429 });
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);
    const dataKey = `otp:data:${tenantRecord.tenantId}:${phone}`;

    // Store hashed OTP with expiry and attempt counter.
    await redis.set(dataKey, { hashedOtp, attempts: 0 }, { ex: OTP_TTL });

    try {
      await sendSms({
        phone,
        message: `Your login code is ${otp}`,
        credentials: {
          login: tenantRecord.smsGateLogin,
          password: tenantRecord.smsGatePassword,
          url: tenantRecord.smsGateUrl,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "OTP sent",
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("OTP send failed:", error);
      // If SMS fails, clear OTP/cooldown so callers can retry immediately.
      await redis.del(dataKey);
      await redis.del(cooldownKey);

      const smsResponse = mapSmsError(error);
      if (smsResponse) {
        return smsResponse;
      }

      return NextResponse.json({ success: false, message: "SMS delivery failed" }, { status: 500 });
    } finally {
      await redis.del(inflightKey);
    }

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
