import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/modules/auth/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

/**
 * Intercepts direct public sign-up requests to enforce invitation-only registration.
 * All new accounts must register via /api/auth/register-invite with a valid single-use token.
 */
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.endsWith("/sign-up/email") || pathname.includes("/sign-up/")) {
    return NextResponse.json(
      {
        error:
          "Public registration is disabled. A valid invitation link is required to create an account.",
      },
      { status: 403 },
    );
  }
  return handler.POST(request);
}
