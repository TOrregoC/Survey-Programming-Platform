import { z } from "zod";
import {
  LOGIC_OPERATORS,
  QUESTION_TYPES,
} from "../constants/questionTypes";

/**
 * Zod schemas for survey JSON validation.
 *
 * Used both server-side (to validate incoming survey payloads) and
 * by the SDK (to validate surveys at runtime before execution).
 */

export const choiceOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
  text: z.string(),
  exclusive: z.boolean().optional(),
});

export const validationRuleSchema = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  customMessage: z.string().optional(),
});

export const questionSchema = z.object({
  id: z.string(),
  type: z.enum(QUESTION_TYPES),
  title: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  randomize: z.boolean().optional(),
  choices: z.array(choiceOptionSchema).optional(),
  rows: z.array(choiceOptionSchema).optional(),
  columns: z.array(choiceOptionSchema).optional(),
  validation: validationRuleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const blockSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  randomize: z.boolean().optional(),
  questions: z.array(questionSchema),
});

export const logicOperandSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("response"), questionId: z.string() }),
    z.object({
      type: z.literal("value"),
      value: z.union([z.string(), z.number(), z.boolean()]),
    }),
    z.object({ type: z.literal("embedded"), key: z.string() }),
  ]),
);

export const logicConditionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    operator: z.enum(LOGIC_OPERATORS),
    left: logicOperandSchema,
    right: logicOperandSchema.optional(),
    all: z.array(logicConditionSchema).optional(),
    any: z.array(logicConditionSchema).optional(),
  }),
);

export const logicRuleSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("skip_to_block"),
    condition: logicConditionSchema,
    action: z.object({ skipToBlockId: z.string() }),
  }),
  z.object({
    id: z.string(),
    type: z.literal("end_survey"),
    condition: logicConditionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("display_logic"),
    questionId: z.string(),
    condition: logicConditionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("piping"),
    text: z.string(),
    pipes: z.array(
      z.object({
        placeholder: z.string(),
        sourceQuestionId: z.string(),
      }),
    ),
  }),
]);

export const quotaRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  target: z.object({
    type: z.literal("response"),
    questionId: z.string(),
  }),
  limits: z.array(
    z.object({
      value: z.string(),
      limit: z.number().int().positive(),
    }),
  ),
  action: z.enum(["stop_survey", "rotate", "queue"]),
});

export const surveySettingsSchema = z.object({
  theme: z.string().optional(),
  showProgress: z.boolean().optional(),
  progressBarType: z.enum(["percentage", "steps", "none"]).optional(),
  allowPartialResponses: z.boolean().optional(),
  respondentIdentification: z
    .enum(["required", "optional", "anonymous"])
    .optional(),
  language: z.string().optional(),
  closedMessage: z.string().optional(),
});

export const surveyDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  blocks: z.array(blockSchema),
  logic: z.array(logicRuleSchema),
  quotas: z.array(quotaRuleSchema),
  settings: surveySettingsSchema,
});

export function validateSurveyDocument(input: unknown) {
  return surveyDocumentSchema.safeParse(input);
}
