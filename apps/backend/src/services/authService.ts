import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { getEnv } from "../lib/env";
import { HttpError } from "../middleware/errorHandler";

export async function registerTenant(input: {
  tenantName: string;
  subdomain: string;
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.tenant.findUnique({
    where: { subdomain: input.subdomain },
  });
  if (existing) {
    throw new HttpError(409, "Subdomain already in use");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: input.tenantName,
      subdomain: input.subdomain,
      users: {
        create: {
          email: input.email,
          name: input.name,
          role: "admin",
          passwordHash,
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0]!;
  return { tenant, user, tokens: issueTokens(user.id, tenant.id, user.role) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email },
  });
  if (!user) throw new HttpError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  return { user, tokens: issueTokens(user.id, user.tenantId, user.role) };
}

export function issueTokens(userId: string, tenantId: string, role: string) {
  const env = getEnv();
  const access = jwt.sign({ userId, tenantId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  });
  const refresh = jwt.sign({ userId, tenantId, role, kind: "refresh" }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  });
  return { access, refresh };
}
