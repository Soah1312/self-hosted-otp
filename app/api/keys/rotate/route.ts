import { NextResponse } from "next/server";
import { ApiKeyAuthError, resolveTenantFromRequest } from "@/lib/auth";
import { rotateTenantKey } from "@/lib/tenant";

function mapAuthError(error: unknown): NextResponse | null {
  if (error instanceof ApiKeyAuthError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
  }

  return null;
}

export async function POST(req: Request) {
  const rawApiKey = req.headers.get("x-api-key");

  try {
    const tenantRecord = await resolveTenantFromRequest(req);

    if (!rawApiKey) {
      return NextResponse.json({ success: false, message: "API key required" }, { status: 401 });
    }

    const { apiKey } = await rotateTenantKey(tenantRecord.tenantId, rawApiKey);

    return NextResponse.json(
      {
        success: true,
        apiKey,
        message: "Your old key is now invalid. Save this new key.",
      },
      { status: 200 }
    );
  } catch (error) {
    const authResponse = mapAuthError(error);
    if (authResponse) {
      return authResponse;
    }

    if (error instanceof Error && (error.message === "Invalid API key" || error.message === "Tenant not found")) {
      return NextResponse.json({ success: false, message: "Invalid API key" }, { status: 401 });
    }

    console.error("API key rotation failed:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
