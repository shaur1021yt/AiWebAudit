import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/store";

export async function GET() {
  const stats = getAdminStats();
  return NextResponse.json(stats);
}
