import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Demo Tenant",
      subdomain: "demo",
    },
  });

  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.local" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.local",
      name: "Demo Admin",
      role: "admin",
      passwordHash,
    },
  });

  console.log("Seed complete. Tenant:", tenant.subdomain);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
