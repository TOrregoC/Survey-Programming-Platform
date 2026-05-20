import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import type { AnswerValue } from "@survey/shared";

export const responsesRouter = Router();

responsesRouter.use(requireAuth);

responsesRouter.get("/", async (req, res, next) => {
  try {
    const surveyId = typeof req.query.surveyId === "string" ? req.query.surveyId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const responses = await prisma.response.findMany({
      where: {
        tenantId: req.auth!.tenantId,
        ...(surveyId ? { surveyId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { startedAt: "desc" },
      take: Math.min(limit, 200),
    });
    res.json({ data: responses });
  } catch (err) {
    next(err);
  }
});

responsesRouter.get("/:id", async (req, res, next) => {
  try {
    const response = await prisma.response.findFirst({
      where: { id: req.params.id!, tenantId: req.auth!.tenantId },
    });
    if (!response) throw new HttpError(404, "Response not found");
    res.json(response);
  } catch (err) {
    next(err);
  }
});

responsesRouter.post("/export", async (req, res, next) => {
  try {
    const surveyId = typeof req.body?.surveyId === "string" ? req.body.surveyId : undefined;
    if (!surveyId) throw new HttpError(400, "surveyId is required");

    const responses = await prisma.response.findMany({
      where: { tenantId: req.auth!.tenantId, surveyId },
      orderBy: { startedAt: "desc" },
    });

    const headers = new Set<string>(["id", "status", "startedAt", "completedAt"]);
    for (const r of responses) {
      for (const key of Object.keys((r.answers as Record<string, AnswerValue>) ?? {})) {
        headers.add(`answer.${key}`);
      }
    }
    const headerList = Array.from(headers);

    const rows = responses.map((r) => {
      const row: Record<string, string> = {
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? "",
      };
      const answers = (r.answers as Record<string, AnswerValue>) ?? {};
      for (const key of Object.keys(answers)) {
        row[`answer.${key}`] = String(answers[key] ?? "");
      }
      return row;
    });

    const csv = [
      headerList.join(","),
      ...rows.map((row) =>
        headerList
          .map((h) => csvEscape(row[h] ?? ""))
          .join(","),
      ),
    ].join("\n");

    res.header("content-type", "text/csv");
    res.header("content-disposition", `attachment; filename="responses-${surveyId}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
