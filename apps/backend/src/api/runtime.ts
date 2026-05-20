import { Router } from "express";
import { z } from "zod";
import {
  completeSession,
  getSessionState,
  startSession,
  submitAnswer,
} from "../services/runtimeService";

/**
 * Runtime endpoints are public — respondents don't need an account.
 * Sessions are identified by a server-issued UUID returned at start.
 */
export const runtimeRouter = Router();

const startBody = z.object({
  embeddedData: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

runtimeRouter.post("/surveys/:id/start", async (req, res, next) => {
  try {
    const body = startBody.parse(req.body ?? {});
    const { session, survey } = await startSession(req.params.id!, body.embeddedData ?? {});
    res.status(201).json({ session, survey: { id: survey.id, title: survey.title, structure: survey.structure } });
  } catch (err) {
    next(err);
  }
});

runtimeRouter.get("/sessions/:sessionId", async (req, res, next) => {
  try {
    const { session, survey } = await getSessionState(req.params.sessionId!);
    res.json({
      session,
      survey: { id: survey.id, title: survey.title, structure: survey.structure },
    });
  } catch (err) {
    next(err);
  }
});

const answerBody = z.object({
  questionId: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  ]),
});

runtimeRouter.post("/sessions/:sessionId/answer", async (req, res, next) => {
  try {
    const body = answerBody.parse(req.body);
    const result = await submitAnswer(req.params.sessionId!, body.questionId, body.value);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

runtimeRouter.post("/sessions/:sessionId/complete", async (req, res, next) => {
  try {
    const response = await completeSession(req.params.sessionId!);
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});
