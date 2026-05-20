import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { WebhookEventType } from "@survey/shared";
import { prisma } from "../lib/prisma";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

/**
 * Enqueue a webhook event for delivery.
 *
 * Creates a WebhookLog row for every active subscription that listens to the
 * given event type. A background worker (started in main.ts) drains pending
 * logs with exponential backoff. Signing uses HMAC-SHA256 with the
 * subscription's per-row secret.
 */
export async function enqueueEvent(
  tenantId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const subs = await prisma.webhookSubscription.findMany({
    where: {
      tenantId,
      active: true,
      events: { has: eventType },
    },
  });
  if (subs.length === 0) return;

  await prisma.webhookLog.createMany({
    data: subs.map((sub) => ({
      subscriptionId: sub.id,
      eventType,
      payload: payload as Prisma.InputJsonValue,
      status: "pending" as const,
    })),
  });
}

/**
 * Sign an outgoing webhook body. The receiving server can verify using the
 * same secret and HMAC-SHA256.
 */
export function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Drain pending webhook logs and attempt delivery once.
 * Called on an interval by startWebhookWorker().
 */
async function deliverPending(): Promise<void> {
  const env = getEnv();
  const now = new Date();
  const pending = await prisma.webhookLog.findMany({
    where: {
      status: "pending",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    include: { subscription: true },
    take: 25,
  });

  for (const log of pending) {
    const body = JSON.stringify({
      eventType: log.eventType,
      payload: log.payload,
      occurredAt: log.createdAt.toISOString(),
    });
    const signature = signPayload(log.subscription.secret, body);

    try {
      const res = await fetch(log.subscription.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-survey-signature": signature,
          "x-survey-event": log.eventType,
        },
        body,
      });

      if (res.ok) {
        await prisma.webhookLog.update({
          where: { id: log.id },
          data: { status: "delivered", statusCode: res.status, nextRetryAt: null },
        });
      } else {
        await scheduleRetry(log.id, log.retries + 1, env.WEBHOOK_MAX_RETRIES, res.status);
      }
    } catch (err) {
      logger.warn({ err, logId: log.id }, "Webhook delivery failed");
      await scheduleRetry(log.id, log.retries + 1, env.WEBHOOK_MAX_RETRIES, null);
    }
  }
}

async function scheduleRetry(
  logId: string,
  retries: number,
  maxRetries: number,
  statusCode: number | null,
): Promise<void> {
  if (retries >= maxRetries) {
    await prisma.webhookLog.update({
      where: { id: logId },
      data: { status: "failed", retries, statusCode, nextRetryAt: null },
    });
    return;
  }

  // Exponential backoff: 30s, 1m, 2m, 4m, 8m, ...
  const delaySeconds = 30 * Math.pow(2, retries - 1);
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

  await prisma.webhookLog.update({
    where: { id: logId },
    data: { retries, statusCode, nextRetryAt },
  });
}

export function startWebhookWorker(intervalMs = 10_000): NodeJS.Timeout {
  return setInterval(() => {
    deliverPending().catch((err) => logger.error({ err }, "Webhook worker tick failed"));
  }, intervalMs);
}
