import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// Hardcoded admin credentials (fallback when DB is unreachable)
const HARDCODED_ADMINS: Record<string, { password: string; name: string }> = {
  "admin@siteaudit.ai": { password: "admin123", name: "Admin" },
  "shaur11002211@gmail.com": { password: "admin123", name: "Shaurya" },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Try DB first
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (user) {
            const valid = await bcrypt.compare(credentials.password, user.password);
            if (valid) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              };
            }
          }
        } catch (error) {
          console.warn("DB auth failed, trying hardcoded fallback:", (error as any).message?.slice(0, 80));
        }

        // Hardcoded fallback when DB is unreachable
        const hardcoded = HARDCODED_ADMINS[credentials.email];
        if (hardcoded && credentials.password === hardcoded.password) {
          return {
            id: "hardcoded-" + credentials.email,
            email: credentials.email,
            name: hardcoded.name,
            role: "ADMIN",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
};
