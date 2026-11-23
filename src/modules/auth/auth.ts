import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { getEmailService } from "@/lib/email";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from "@/lib/email/templates";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-only-fallback-secret-replace-in-production-32chars",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    async sendResetPassword({ user, url }) {
      await getEmailService().send(
        buildPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl: url,
        }),
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await getEmailService().send(
        buildEmailVerificationEmail({
          to: user.email,
          name: user.name,
          verifyUrl: url,
        }),
      );
    },
  },
  user: {
    additionalFields: {
      professionalTitle: {
        type: "string",
        required: false,
      },
      hospital: {
        type: "string",
        required: false,
      },
      profileImage: {
        type: "string",
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: false, // Always check DB session so revocations take effect immediately
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
