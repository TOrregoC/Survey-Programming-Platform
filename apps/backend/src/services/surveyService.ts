import type { Prisma } from "@prisma/client";
import {
  validateSurveyDocument,
  type SurveyDocument,
} from "@survey/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler";

interface CreateSurveyInput {
  tenantId: string;
  ownerId: string;
  title: string;
  description?: string;
  structure?: SurveyDocument;
}

/**
 * Create a draft survey with an empty default structure if one isn't provided.
 */
export async function createSurvey(input: CreateSurveyInput) {
  const structure: SurveyDocument =
    input.structure ?? emptySurveyDocument(input.title);

  const parsed = validateSurveyDocument(structure);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid survey structure", parsed.error.format());
  }

  return prisma.survey.create({
    data: {
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      structure: structure as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listSurveys(tenantId: string, opts: { limit?: number; cursor?: string } = {}) {
  return prisma.survey.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    take: opts.limit ?? 25,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
  });
}

export async function getSurvey(tenantId: string, surveyId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, tenantId },
  });
  if (!survey) throw new HttpError(404, "Survey not found");
  return survey;
}

export async function updateSurvey(
  tenantId: string,
  surveyId: string,
  patch: { title?: string; description?: string; structure?: SurveyDocument },
) {
  const existing = await getSurvey(tenantId, surveyId);

  if (patch.structure) {
    const parsed = validateSurveyDocument(patch.structure);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid survey structure", parsed.error.format());
    }
  }

  return prisma.survey.update({
    where: { id: existing.id },
    data: {
      ...(patch.title != null ? { title: patch.title } : {}),
      ...(patch.description != null ? { description: patch.description } : {}),
      ...(patch.structure
        ? { structure: patch.structure as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function deleteSurvey(tenantId: string, surveyId: string) {
  const existing = await getSurvey(tenantId, surveyId);
  await prisma.survey.delete({ where: { id: existing.id } });
}

/**
 * Publish creates a SurveyVersion snapshot and flips status to "published".
 * Once published, the structure is immutable for that version — further edits
 * must produce a new version (handled separately by `publishNewVersion`).
 */
export async function publishSurvey(tenantId: string, surveyId: string) {
  const survey = await getSurvey(tenantId, surveyId);

  return prisma.$transaction(async (tx) => {
    const nextVersion = survey.version;
    await tx.surveyVersion.create({
      data: {
        surveyId: survey.id,
        versionNumber: nextVersion,
        structure: survey.structure as Prisma.InputJsonValue,
      },
    });
    return tx.survey.update({
      where: { id: survey.id },
      data: { status: "published", publishedAt: new Date() },
    });
  });
}

export async function cloneSurvey(tenantId: string, ownerId: string, surveyId: string) {
  const source = await getSurvey(tenantId, surveyId);
  return prisma.survey.create({
    data: {
      tenantId,
      ownerId,
      title: `${source.title} (copy)`,
      description: source.description,
      structure: source.structure as Prisma.InputJsonValue,
      status: "draft",
    },
  });
}

function emptySurveyDocument(title: string): SurveyDocument {
  return {
    id: "doc",
    title,
    blocks: [
      {
        id: "block_default",
        title: "Default block",
        questions: [],
      },
    ],
    logic: [],
    quotas: [],
    settings: {
      showProgress: true,
      progressBarType: "percentage",
      respondentIdentification: "optional",
    },
  };
}
