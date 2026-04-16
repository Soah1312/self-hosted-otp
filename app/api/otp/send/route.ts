import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendSms } from "@/lib/sms";

const OTP_TTL = 300; // 5 minutes
const COOLDOWN_TTL = 60; // 60 seconds
const INFLIGHT_TTL = 15; // prevent duplicate concurrent sends

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!validateApiKey(apiKey)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const phone = body?.phone;
    if (!phone || typeof phone !== "string" || !/^\+91\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Invalid phone number format" }, { status: 422 });
    }

    const cooldownKey = `otp:cooldown:${phone}`;
    const inflightKey = `otp:inflight:${phone}`;

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
      await redis.del(inflightKey);
      return NextResponse.json({ success: false, message: "Resend cooldown active", retryAfter: ttl }, { status: 429 });
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);
    const dataKey = `otp:data:${phone}`;

    // Store hashed OTP with expiry and attempt counter.
    await redis.set(dataKey, { hashedOtp, attempts: 0 }, { ex: OTP_TTL });

    try {
      const smsResult = await sendSms(phone, otp);
      return NextResponse.json(
        {
          success: true,
          message: "OTP sent",
          messageId: smsResult.messageId,
          deliveryState: smsResult.state,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("OTP send failed:", error);
      // If SMS fails, clear OTP/cooldown so callers can retry immediately.
      await redis.del(dataKey);
      await redis.del(cooldownKey);
      return NextResponse.json({ success: false, message: "SMS sending failed" }, { status: 500 });
    } finally {
      await redis.del(inflightKey);
    }

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
