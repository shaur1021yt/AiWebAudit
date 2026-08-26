import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserAuditsFromDb } from "@/lib/db";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const audits = await getUserAuditsFromDb(userId);

    return NextResponse.json({
      audits: audits.map((a) => ({
        id: a.id,
        url: a.website?.url || "",
        domain: a.website?.domain || "",
        status: a.status,
        score: a.overallScore ?? null,
        issueCount: a.issues
          ? Object.values(a.issues as any).reduce(
              (sum: number, cat: any) => sum + (cat?.issues?.length || 0),
              0
            )
          : 0,
        duration: a.duration ?? null,
        paidReport: a.paidReport,
        hasReport: !!a.report,
        createdAt: a.createdAt.getTime(),
      })),
    });
  } catch (error) {
    // DB unreachable — return empty list
    return NextResponse.json({ audits: [] });
  }
}
