import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { WEBHOOK_EVENT_TYPES } from "@survey/shared";

export const webhooksRouter = Router();

webhooksRouter.use(requireAuth);

const createBody = z.object({
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1),
  active: z.boolean().optional().default(true),
});

webhooksRouter.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const body = createBody.parse(req.body);
    const secret = crypto.randomBytes(32).toString("hex");

    const sub = await prisma.webhookSubscription.create({
      data: {
        tenantId: req.auth!.tenantId,
        url: body.url,
        events: body.events,
        active: body.active,
        secret,
      },
    });

    // Return the secret on creation only — store securely on caller side.
    res.status(201).json({
      id: sub.id,
      url: sub.url,
      events: sub.events,
      active: sub.active,
      secret,
      createdAt: sub.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

webhooksRouter.get("/", async (req, res, next) => {
  try {
    const subs = await prisma.webhookSubscription.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      data: subs.map((s) => ({
        id: s.id,
        url: s.url,
        events: s.events,
        active: s.active,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const patchBody = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).optional(),
  active: z.boolean().optional(),
});

webhooksRouter.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const body = patchBody.parse(req.body);
    const existing = await prisma.webhookSubscription.findFirst({
      where: { id: req.params.id!, tenantId: req.auth!.tenantId },
    });
    if (!existing) throw new HttpError(404, "Subscription not found");

    const updated = await prisma.webhookSubscription.update({
      where: { id: existing.id },
      data: body,
    });
    res.json({
      id: updated.id,
      url: updated.url,
      events: updated.events,
      active: updated.active,
    });
  } catch (err) {
    next(err);
  }
});

webhooksRouter.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const existing = await prisma.webhookSubscription.findFirst({
      where: { id: req.params.id!, tenantId: req.auth!.tenantId },
    });
    if (!existing) throw new HttpError(404, "Subscription not found");
    await prisma.webhookSubscription.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

webhooksRouter.get("/:id/logs", async (req, res, next) => {
  try {
    const existing = await prisma.webhookSubscription.findFirst({
      where: { id: req.params.id!, tenantId: req.auth!.tenantId },
    });
    if (!existing) throw new HttpError(404, "Subscription not found");

    const logs = await prisma.webhookLog.findMany({
      where: { subscriptionId: existing.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
});
