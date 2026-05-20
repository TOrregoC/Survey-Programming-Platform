import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  cloneSurvey,
  createSurvey,
  deleteSurvey,
  getSurvey,
  listSurveys,
  publishSurvey,
  updateSurvey,
} from "../services/surveyService";
import { surveyDocumentSchema } from "@survey/shared";

export const surveysRouter = Router();

surveysRouter.use(requireAuth);

const createBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  structure: surveyDocumentSchema.optional(),
});

surveysRouter.post("/", requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const body = createBody.parse(req.body);
    const survey = await createSurvey({
      tenantId: req.auth!.tenantId,
      ownerId: req.auth!.userId,
      ...body,
    });
    res.status(201).json(survey);
  } catch (err) {
    next(err);
  }
});

surveysRouter.get("/", async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const surveys = await listSurveys(req.auth!.tenantId, { limit, cursor });
    res.json({ data: surveys });
  } catch (err) {
    next(err);
  }
});

surveysRouter.get("/:id", async (req, res, next) => {
  try {
    const survey = await getSurvey(req.auth!.tenantId, req.params.id!);
    res.json(survey);
  } catch (err) {
    next(err);
  }
});

const patchBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  structure: surveyDocumentSchema.optional(),
});

surveysRouter.patch("/:id", requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const body = patchBody.parse(req.body);
    const survey = await updateSurvey(req.auth!.tenantId, req.params.id!, body);
    res.json(survey);
  } catch (err) {
    next(err);
  }
});

surveysRouter.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await deleteSurvey(req.auth!.tenantId, req.params.id!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

surveysRouter.post("/:id/publish", requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const survey = await publishSurvey(req.auth!.tenantId, req.params.id!);
    res.json(survey);
  } catch (err) {
    next(err);
  }
});

surveysRouter.post("/:id/clone", requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const survey = await cloneSurvey(req.auth!.tenantId, req.auth!.userId, req.params.id!);
    res.status(201).json(survey);
  } catch (err) {
    next(err);
  }
});
