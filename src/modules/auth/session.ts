import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "@/lib/db";

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

export async function getServerSession() {
  const hdrs = await headers();
  return auth.api.getSession({ headers: hdrs });
}

/**
 * Server-side guard for authenticated pages. Redirects to /login if unauthenticated.
 */
export async function requireSession(): Promise<{
  sessionId: string;
  user: AuthenticatedUser;
}> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      professionalTitle: true,
      hospital: true,
      profileImage: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return {
    sessionId: session.session.id,
    user,
  };
}

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
