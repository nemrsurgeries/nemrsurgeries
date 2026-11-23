import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/modules/auth/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { acceptInvitationRegisterSchema } from "@/modules/invitations/schemas";
import {
  finalizeInvitationAcceptance,
  validateInvitationToken,
} from "@/modules/invitations/service";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const parsed = acceptInvitationRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Validation failed.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { token, name, password, professionalTitle, hospital } = parsed.data;

  const validation = await validateInvitationToken(token);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.message }, { status: 403 });
  }

  const { invitation } = validation;

  const existingUser = await db.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  try {
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: invitation.email,
        password,
        name,
        professionalTitle: professionalTitle || undefined,
        hospital: hospital || undefined,
      },
      asResponse: true,
    });

    if (!signUpResponse.ok) {
      const errData = (await signUpResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      return NextResponse.json(
        { error: errData.message ?? "Unable to create account." },
        { status: signUpResponse.status },
      );
    }

    const createdUser = await db.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, email: true, name: true },
    });

    if (!createdUser) {
      return NextResponse.json(
        { error: "Account creation did not complete." },
        { status: 500 },
      );
    }

    await finalizeInvitationAcceptance({
      invitationId: invitation.id,
      newUserId: createdUser.id,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
        },
      },
      { status: 201 },
    );

    // Forward Better Auth session cookies set during signUpEmail
    const setCookies = signUpResponse.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      response.headers.append("Set-Cookie", cookie);
    }

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
