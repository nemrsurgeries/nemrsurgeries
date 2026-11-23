import { PrismaClient } from "@prisma/client";
import { auth } from "../src/modules/auth/auth";

const prisma = new PrismaClient();

/**
 * Bootstraps a fictional initial orthopedic surgeon account for local development.
 * Never uses real patient data.
 */
async function main() {
  const email = process.env.SEED_DOCTOR_EMAIL ?? "dr.karim.mansour@orthocase.dev";
  const password = process.env.SEED_DOCTOR_PASSWORD ?? "OrthoCase2026!";
  const name = "Dr. Karim Mansour";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Initial doctor already exists: ${email}`);
    return;
  }

  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      professionalTitle: "Consultant Orthopedic Trauma Surgeon",
      hospital: "Cairo Orthopedic Teaching Hospital (Fictional)",
    },
  });

  await prisma.user.update({
    where: { email },
    data: { emailVerified: true },
  });

  console.log(`[seed] Created initial doctor account: ${email}`);
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
