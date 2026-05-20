import type { Prisma } from "@prisma/client";
import { SurveyRuntime } from "@survey/sdk";
import type {
  AnswerValue,
  SurveyDocument,
  SurveySession,
} from "@survey/shared";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler";
import { enqueueEvent } from "../webhooks/dispatcher";

/**
 * Start a runtime session for a published survey.
 * Anonymous respondents are supported (no auth required).
 */
export async function startSession(
  surveyId: string,
  embeddedData: Record<string, string | number | boolean> = {},
) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, status: "published" },
  });
  if (!survey) throw new HttpError(404, "Survey not found or not published");

  const session = await prisma.runtimeSession.create({
    data: {
      surveyId: survey.id,
      surveyVersion: survey.version,
      tenantId: survey.tenantId,
      embeddedData: embeddedData as Prisma.InputJsonValue,
      status: "started",
    },
  });

  await enqueueEvent(survey.tenantId, "response.started", {
    sessionId: session.id,
    surveyId: survey.id,
  });

  return {
    session: toSessionDto(session, survey.structure as unknown as SurveyDocument),
    survey,
  };
}

export async function getSessionState(sessionId: string) {
  const session = await prisma.runtimeSession.findUnique({
    where: { id: sessionId },
    include: { survey: true },
  });
  if (!session) throw new HttpError(404, "Session not found");
  return toSessionDto(session, session.survey.structure as unknown as SurveyDocument);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  value: AnswerValue,
) {
  const session = await prisma.runtimeSession.findUnique({
    where: { id: sessionId },
    include: { survey: true },
  });
  if (!session) throw new HttpError(404, "Session not found");
  if (session.status === "completed" || session.status === "abandoned") {
    throw new HttpError(409, `Session is ${session.status}`);
  }

  const survey = session.survey;
  const runtime = new SurveyRuntime(survey.structure as unknown as SurveyDocument);
  const errors = runtime.validateAnswer(questionId, value);
  if (errors.length > 0) {
    throw new HttpError(400, "Validation failed", { questionId, errors });
  }

  const answers = {
    ...(session.answers as Record<string, AnswerValue>),
    [questionId]: value,
  };

  // Locate the just-answered question's block so the runtime walks forward
  // from it rather than from the stale cursor on the session row.
  const structure = survey.structure as unknown as SurveyDocument;
  const answeredBlock = structure.blocks.find((b) =>
    b.questions.some((q) => q.id === questionId),
  );

  const sessionDto: SurveySession = toSessionDto(
    {
      ...session,
      answers,
      currentBlockId: answeredBlock?.id ?? session.currentBlockId,
      currentQuestionId: questionId,
    },
    structure,
  );
  const next = runtime.getNextQuestion(sessionDto);

  const updated = await prisma.runtimeSession.update({
    where: { id: session.id },
    data: {
      answers: answers as Prisma.InputJsonValue,
      status: "in_progress",
      currentBlockId: next?.block.id ?? session.currentBlockId,
      currentQuestionId: next?.question.id ?? null,
    },
  });

  await enqueueEvent(survey.tenantId, "response.answered", {
    sessionId: session.id,
    surveyId: survey.id,
    questionId,
  });

  return {
    session: toSessionDto(updated, survey.structure as unknown as SurveyDocument),
    next: next
      ? {
          blockId: next.block.id,
          question: next.question,
          pipedTitle: next.pipedTitle,
        }
      : null,
  };
}

export async function completeSession(sessionId: string) {
  const session = await prisma.runtimeSession.findUnique({
    where: { id: sessionId },
    include: { survey: true },
  });
  if (!session) throw new HttpError(404, "Session not found");
  if (session.status === "completed") {
    throw new HttpError(409, "Session already completed");
  }

  const now = new Date();
  const response = await prisma.$transaction(async (tx) => {
    const updated = await tx.runtimeSession.update({
      where: { id: session.id },
      data: { status: "completed", completedAt: now },
    });
    return tx.response.create({
      data: {
        surveyId: session.surveyId,
        surveyVersion: session.surveyVersion,
        tenantId: session.tenantId,
        sessionId: session.id,
        respondentId: session.respondentId,
        status: "completed",
        data: session.embeddedData as Prisma.InputJsonValue,
        answers: session.answers as Prisma.InputJsonValue,
        startedAt: session.startedAt,
        completedAt: now,
        updatedAt: updated.updatedAt,
      },
    });
  });

  await enqueueEvent(session.tenantId, "response.completed", {
    sessionId: session.id,
    responseId: response.id,
    surveyId: session.surveyId,
  });

  return response;
}

function toSessionDto(
  session: {
    id: string;
    surveyId: string;
    surveyVersion: number;
    currentBlockId: string | null;
    currentQuestionId: string | null;
    answers: unknown;
    embeddedData: unknown;
    status: string;
    startedAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  },
  _survey: SurveyDocument,
): SurveySession {
  return {
    sessionId: session.id,
    surveyId: session.surveyId,
    surveyVersion: session.surveyVersion,
    currentBlockId: session.currentBlockId,
    currentQuestionId: session.currentQuestionId,
    answers: (session.answers as Record<string, AnswerValue>) ?? {},
    embeddedData:
      (session.embeddedData as Record<string, string | number | boolean>) ?? {},
    status: session.status as SurveySession["status"],
    startedAt: session.startedAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    completedAt: session.completedAt?.toISOString(),
  };
}
