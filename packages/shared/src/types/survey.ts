import type { LogicOperator, QuestionType } from "../constants/questionTypes";

/**
 * Canonical survey JSON schema.
 *
 * The survey "structure" is stored as a single JSON document on the Survey row
 * and snapshotted on each SurveyVersion. This file is the source of truth for
 * the shape — the builder UI, runtime engine, and SDK all read and write it.
 */

export interface SurveyDocument {
  id: string;
  title: string;
  description?: string;
  blocks: Block[];
  logic: LogicRule[];
  quotas: QuotaRule[];
  settings: SurveySettings;
}

export interface Block {
  id: string;
  title?: string;
  description?: string;
  randomize?: boolean;
  questions: Question[];
}

export interface ChoiceOption {
  id: string;
  value: string;
  text: string;
  exclusive?: boolean;
}

export interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required?: boolean;
  randomize?: boolean;
  choices?: ChoiceOption[];
  rows?: ChoiceOption[]; // for matrix questions
  columns?: ChoiceOption[]; // for matrix questions
  validation?: ValidationRule;
  metadata?: Record<string, unknown>;
}

export type LogicOperand =
  | { type: "response"; questionId: string }
  | { type: "value"; value: string | number | boolean }
  | { type: "embedded"; key: string };

export interface LogicCondition {
  operator: LogicOperator;
  left: LogicOperand;
  right?: LogicOperand;
  // Composition: AND/OR groups
  all?: LogicCondition[];
  any?: LogicCondition[];
}

export type LogicRule =
  | {
      id: string;
      type: "skip_to_block";
      condition: LogicCondition;
      action: { skipToBlockId: string };
    }
  | {
      id: string;
      type: "end_survey";
      condition: LogicCondition;
    }
  | {
      id: string;
      type: "display_logic";
      questionId: string;
      condition: LogicCondition;
    }
  | {
      id: string;
      type: "piping";
      text: string;
      pipes: Array<{ placeholder: string; sourceQuestionId: string }>;
    };

export interface QuotaRule {
  id: string;
  name: string;
  target: { type: "response"; questionId: string };
  limits: Array<{ value: string; limit: number }>;
  action: "stop_survey" | "rotate" | "queue";
}

export interface SurveySettings {
  theme?: string;
  showProgress?: boolean;
  progressBarType?: "percentage" | "steps" | "none";
  allowPartialResponses?: boolean;
  respondentIdentification?: "required" | "optional" | "anonymous";
  language?: string;
  closedMessage?: string;
}

/**
 * Runtime session state — used by SDK and runtime endpoints.
 */
export interface SurveySession {
  sessionId: string;
  surveyId: string;
  surveyVersion: number;
  currentBlockId: string | null;
  currentQuestionId: string | null;
  answers: Record<string, AnswerValue>;
  embeddedData: Record<string, string | number | boolean>;
  status: "started" | "in_progress" | "completed" | "abandoned";
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string | number | boolean | string[]>;
