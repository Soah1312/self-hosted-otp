import { NextResponse } from "next/server";
import { listTenantSummaries } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const adminKey = req.headers.get("x-admin-key");
    const expectedAdminKey = process.env.ADMIN_SECRET_KEY;

    if (!expectedAdminKey) {
      return NextResponse.json({ success: false, message: "Admin key is not configured" }, { status: 500 });
    }

    if (!adminKey || adminKey !== expectedAdminKey) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const tenants = await listTenantSummaries();

    return NextResponse.json(
      {
        success: true,
        total: tenants.length,
        tenants,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("List tenants failed:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
