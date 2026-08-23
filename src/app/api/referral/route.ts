import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/referral — validate a referral code
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
    }

    const referral = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!referral || !referral.isActive) {
      return NextResponse.json({ valid: false, error: "Invalid or expired referral code" });
    }

    return NextResponse.json({
      valid: true,
      code: referral.code,
      discountPct: referral.discountPct,
      usesCount: referral.usesCount,
    });
  } catch (error: any) {
    console.error("Referral validation error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
