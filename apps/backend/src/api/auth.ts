import { Router } from "express";
import { z } from "zod";
import { login, registerTenant } from "../services/authService";

export const authRouter = Router();

const registerBody = z.object({
  tenantName: z.string().min(2),
  subdomain: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase, numeric, or hyphenated"),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const data = registerBody.parse(req.body);
    const { tenant, user, tokens } = await registerTenant(data);
    res.status(201).json({
      tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    });
  } catch (err) {
    next(err);
  }
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = loginBody.parse(req.body);
    const { user, tokens } = await login(data.email, data.password);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    });
  } catch (err) {
    next(err);
  }
});
