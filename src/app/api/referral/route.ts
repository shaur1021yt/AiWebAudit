import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fallback codes when DB is unreachable (e.g. Vercel serverless)
const FALLBACK_CODES: Record<string, number> = {
  BOBBY25: 25,
  LAUNCH30: 30,
};

// POST /api/referral — validate a referral code
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
    }

    const normalized = code.toUpperCase().trim();

    // Try DB first
    try {
      const referral = await prisma.referralCode.findUnique({
        where: { code: normalized },
      });

      if (referral && referral.isActive) {
        return NextResponse.json({
          valid: true,
          code: referral.code,
          discountPct: referral.discountPct,
          usesCount: referral.usesCount,
        });
      }
    } catch {
      // DB is down, try fallback
    }

    // Fallback: check hardcoded codes
    if (FALLBACK_CODES[normalized]) {
      return NextResponse.json({
        valid: true,
        code: normalized,
        discountPct: FALLBACK_CODES[normalized],
        usesCount: 0,
      });
    }

    return NextResponse.json({ valid: false, error: "Invalid or expired referral code" });
  } catch (error: any) {
    console.error("Referral validation error:", error);
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
