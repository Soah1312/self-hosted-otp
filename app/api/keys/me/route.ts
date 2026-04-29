import { NextResponse } from "next/server";
import { ApiKeyAuthError, resolveTenantFromRequest } from "@/lib/auth";

function mapAuthError(error: unknown): NextResponse | null {
  if (error instanceof ApiKeyAuthError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const tenantRecord = await resolveTenantFromRequest(req);

    return NextResponse.json(
      {
        success: true,
        tenantId: tenantRecord.tenantId,
        status: tenantRecord.status,
        smsGateUrl: tenantRecord.smsGateUrl,
        createdAt: tenantRecord.createdAt,
        lastUsedAt: tenantRecord.lastUsedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    const authResponse = mapAuthError(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Get tenant profile failed:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
