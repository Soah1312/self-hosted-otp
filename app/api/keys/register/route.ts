import { NextResponse } from "next/server";
import { createTenant } from "@/lib/tenant";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const smsGateLogin = typeof body?.smsGateLogin === "string" ? body.smsGateLogin.trim() : "";
    const smsGatePassword = typeof body?.smsGatePassword === "string" ? body.smsGatePassword.trim() : "";
    const smsGateUrl = typeof body?.smsGateUrl === "string" ? body.smsGateUrl.trim() : "";

    if (!smsGateLogin || !smsGatePassword || !smsGateUrl) {
      return NextResponse.json(
        { success: false, message: "smsGateLogin, smsGatePassword, and smsGateUrl are required" },
        { status: 422 }
      );
    }

    if (!smsGateUrl.startsWith("https://")) {
      return NextResponse.json(
        { success: false, message: "smsGateUrl must start with https://" },
        { status: 422 }
      );
    }

    const { apiKey, tenantId } = await createTenant({
      smsGateLogin,
      smsGatePassword,
      smsGateUrl,
    });

    return NextResponse.json(
      {
        success: true,
        apiKey,
        tenantId,
        message: "Save your API key now. It will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tenant registration failed:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
