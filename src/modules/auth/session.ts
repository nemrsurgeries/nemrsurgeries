import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  professionalTitle: string | null;
  hospital: string | null;
  profileImage: string | null;
  createdAt: Date;
}

export const getServerSession = cache(async () => {
  const hdrs = await headers();
  return auth.api.getSession({ headers: hdrs });
});

/**
 * Server-side guard for authenticated pages. Redirects to /login if unauthenticated.
 * Deduplicated per request via React cache() and reads user fields directly from
 * the Better Auth session payload to avoid an extra DB round-trip.
 */
export const requireSession = cache(async (): Promise<{
  sessionId: string;
  user: AuthenticatedUser;
}> => {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionUser = session.user as typeof session.user & {
    professionalTitle?: string | null;
    hospital?: string | null;
    profileImage?: string | null;
  };

  return {
    sessionId: session.session.id,
    user: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      emailVerified: Boolean(sessionUser.emailVerified),
      professionalTitle: sessionUser.professionalTitle ?? null,
      hospital: sessionUser.hospital ?? null,
      profileImage: sessionUser.profileImage ?? null,
      createdAt:
        sessionUser.createdAt instanceof Date
          ? sessionUser.createdAt
          : new Date(sessionUser.createdAt),
    },
  };
});

/**
 * Server-side guard for Server Actions & API Route Handlers (throws instead of redirecting).
 */
export async function requireApiSession(): Promise<{
  sessionId: string;
  userId: string;
}> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    sessionId: session.session.id,
    userId: session.user.id,
  };
}
