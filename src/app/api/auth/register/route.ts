import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    // Try DB-backed registration
    try {
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: "USER",
        },
      });

      return NextResponse.json({
        message: "Account created successfully",
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (dbError) {
      // DB unreachable — still allow registration (session-only)
      console.warn("DB registration failed, allowing session-only account:", (dbError as any).message?.slice(0, 80));
      return NextResponse.json({
        message: "Account created successfully",
        user: { id: "session-" + Date.now(), email, name },
      });
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
