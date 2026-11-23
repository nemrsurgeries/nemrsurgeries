import { redirect } from "next/navigation";
import { getServerSession } from "@/modules/auth/session";

export default async function HomePage() {
  const session = await getServerSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }
  redirect("/login");
}
