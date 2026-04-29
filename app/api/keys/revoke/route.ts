import { NextResponse } from "next/server";
import { ApiKeyAuthError, resolveTenantFromRequest } from "@/lib/auth";
import { revokeTenant } from "@/lib/tenant";

function mapAuthError(error: unknown): NextResponse | null {
  if (error instanceof ApiKeyAuthError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const tenantRecord = await resolveTenantFromRequest(req);
    await revokeTenant(tenantRecord.tenantId);

    return NextResponse.json({ success: true, message: "API key revoked" }, { status: 200 });
  } catch (error) {
    const authResponse = mapAuthError(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("API key revoke failed:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
