import { NextResponse } from "next/server";
import { ApiKeyAuthError, resolveTenantFromRequest } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { hashOtp } from "@/lib/otp";

function mapAuthError(error: unknown): NextResponse | null {
  if (error instanceof ApiKeyAuthError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
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
    const otp = body?.otp;

    if (!phone || !otp) {
      return NextResponse.json({ success: false, message: "Missing phone or otp" }, { status: 422 });
    }

    if (typeof phone !== "string" || !/^\+91\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Invalid phone number format" }, { status: 422 });
    }

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ success: false, message: "Invalid OTP format" }, { status: 422 });
    }

    const dataKey = `otp:data:${tenantRecord.tenantId}:${phone}`;
    const otpData = await redis.get<{ hashedOtp: string; attempts: number }>(dataKey);

    if (!otpData) {
      return NextResponse.json({ success: false, message: "OTP expired or not found" }, { status: 404 });
    }

    if (otpData.attempts >= 3) {
      await redis.del(dataKey);
      return NextResponse.json({ success: false, message: "Too many attempts. Request a new OTP." }, { status: 410 });
    }

    const newAttemptCount = otpData.attempts + 1;
    await redis.set(dataKey, { ...otpData, attempts: newAttemptCount }, { keepTtl: true });

    if (hashOtp(otp) === otpData.hashedOtp) {
      await redis.del(dataKey);
      return NextResponse.json({ success: true, message: "OTP verified" }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid OTP",
      attemptsLeft: 3 - newAttemptCount
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
