import type {
  AnswerValue,
  Block,
  LogicRule,
  Question,
  SurveyDocument,
  SurveySession,
  ValidationRule,
} from "@survey/shared";
import { evaluateCondition, interpolatePiping } from "./logic";

/**
 * Headless survey runtime.
 *
 * Stateless evaluation logic over a {@link SurveyDocument} and a session's
 * accumulated answers. The runtime is intentionally pure: no I/O, no DB, no
 * fetch calls — it can be embedded in the backend, the frontend, or any
 * developer's app via the SDK.
 *
 * Stateful concerns (persisting the session, enforcing quotas, emitting
 * webhooks) belong to the backend services that wrap this engine.
 */
export class SurveyRuntime {
  private readonly survey: SurveyDocument;
  private readonly blockIndex: Map<string, number>;
  private readonly questionIndex: Map<string, { blockId: string; question: Question }>;

  constructor(survey: SurveyDocument) {
    this.survey = survey;
    this.blockIndex = new Map(survey.blocks.map((b, idx) => [b.id, idx]));
    this.questionIndex = new Map();
    for (const block of survey.blocks) {
      for (const question of block.questions) {
        this.questionIndex.set(question.id, { blockId: block.id, question });
      }
    }
  }

  getSurvey(): SurveyDocument {
    return this.survey;
  }

  /**
   * Resolve the next question to display for a session, respecting:
   *   - skip_to_block logic
   *   - end_survey logic
   *   - display_logic on individual questions
   *   - block and question ordering (no randomization here — that happens at
   *     session start when ordering is locked in)
   */
  getNextQuestion(session: SurveySession): {
    block: Block;
    question: Question;
    pipedTitle: string;
  } | null {
    // Honor any end_survey logic first
    for (const rule of this.survey.logic) {
      if (rule.type === "end_survey" && this.evaluate(rule, session)) {
        return null;
      }
    }

    const currentBlockIdx = session.currentBlockId
      ? (this.blockIndex.get(session.currentBlockId) ?? 0)
      : 0;
    const currentBlock = this.survey.blocks[currentBlockIdx];
    if (!currentBlock) return null;

    const currentQuestionIdx = session.currentQuestionId
      ? currentBlock.questions.findIndex(
          (q) => q.id === session.currentQuestionId,
        )
      : -1;

    // 1. Try next question in current block (skipping hidden ones)
    for (let i = currentQuestionIdx + 1; i < currentBlock.questions.length; i++) {
      const candidate = currentBlock.questions[i];
      if (!candidate) continue;
      if (this.shouldDisplay(candidate.id, session)) {
        return this.buildQuestionPayload(currentBlock, candidate, session);
      }
    }

    // 2. Apply skip_to_block rules — if any fires, jump there
    for (const rule of this.survey.logic) {
      if (rule.type === "skip_to_block" && this.evaluate(rule, session)) {
        const targetIdx = this.blockIndex.get(rule.action.skipToBlockId);
        if (targetIdx != null) {
          return this.firstVisibleQuestionInBlock(targetIdx, session);
        }
      }
    }

    // 3. Otherwise, advance to next block
    return this.firstVisibleQuestionInBlock(currentBlockIdx + 1, session);
  }

  /**
   * Whether a question is visible for the current session given any
   * display_logic rules attached to it.
   */
  shouldDisplay(questionId: string, session: SurveySession): boolean {
    const rules = this.survey.logic.filter(
      (r): r is Extract<LogicRule, { type: "display_logic" }> =>
        r.type === "display_logic" && r.questionId === questionId,
    );
    if (rules.length === 0) return true;
    return rules.every((r) =>
      evaluateCondition(r.condition, {
        answers: session.answers,
        embeddedData: session.embeddedData,
      }),
    );
  }

  /**
   * Validate a candidate answer against a question's type and validation rules.
   * Returns a list of human-readable validation errors, empty if valid.
   */
  validateAnswer(questionId: string, value: AnswerValue): string[] {
    const entry = this.questionIndex.get(questionId);
    if (!entry) return [`Unknown question: ${questionId}`];
    const { question } = entry;
    const errors: string[] = [];

    if (
      question.required &&
      (value == null || (typeof value === "string" && value.trim() === ""))
    ) {
      errors.push("This question is required");
    }

    if (value != null && question.validation) {
      errors.push(...this.applyValidationRule(value, question.validation));
    }

    // Type-specific minimal checks
    if (question.type === "number" && value != null) {
      if (Number.isNaN(Number(value))) {
        errors.push("Value must be a number");
      }
    }

    if (question.type === "email" && typeof value === "string" && value.length > 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push("Value must be a valid email address");
      }
    }

    return errors;
  }

  /**
   * Resolve a question's display title with any piping placeholders substituted.
   */
  pipeTitle(question: Question, session: SurveySession): string {
    const pipingRules = this.survey.logic.filter(
      (r): r is Extract<LogicRule, { type: "piping" }> => r.type === "piping",
    );
    let title = question.title;
    for (const rule of pipingRules) {
      if (rule.text === question.title) {
        title = interpolatePiping(rule.text, rule.pipes, session.answers);
      }
    }
    return title;
  }

  // ---------- internals ----------

  private evaluate(rule: LogicRule, session: SurveySession): boolean {
    if (rule.type === "skip_to_block" || rule.type === "end_survey") {
      return evaluateCondition(rule.condition, {
        answers: session.answers,
        embeddedData: session.embeddedData,
      });
    }
    return false;
  }

  private firstVisibleQuestionInBlock(
    blockIdx: number,
    session: SurveySession,
  ): { block: Block; question: Question; pipedTitle: string } | null {
    for (let i = blockIdx; i < this.survey.blocks.length; i++) {
      const block = this.survey.blocks[i];
      if (!block) continue;
      for (const candidate of block.questions) {
        if (this.shouldDisplay(candidate.id, session)) {
          return this.buildQuestionPayload(block, candidate, session);
        }
      }
    }
    return null;
  }

  private buildQuestionPayload(
    block: Block,
    question: Question,
    session: SurveySession,
  ) {
    return {
      block,
      question,
      pipedTitle: this.pipeTitle(question, session),
    };
  }

  private applyValidationRule(value: AnswerValue, rule: ValidationRule): string[] {
    const errors: string[] = [];
    if (typeof value === "string") {
      if (rule.minLength != null && value.length < rule.minLength) {
        errors.push(
          rule.customMessage ?? `Minimum length is ${rule.minLength}`,
        );
      }
      if (rule.maxLength != null && value.length > rule.maxLength) {
        errors.push(
          rule.customMessage ?? `Maximum length is ${rule.maxLength}`,
        );
      }
      if (rule.pattern != null) {
        try {
          if (!new RegExp(rule.pattern).test(value)) {
            errors.push(rule.customMessage ?? "Value does not match required pattern");
          }
        } catch {
          // Bad pattern — ignore silently; survey author should fix in builder
        }
      }
    }
    if (typeof value === "number") {
      if (rule.min != null && value < rule.min) {
        errors.push(rule.customMessage ?? `Minimum is ${rule.min}`);
      }
      if (rule.max != null && value > rule.max) {
        errors.push(rule.customMessage ?? `Maximum is ${rule.max}`);
      }
    }
    return errors;
  }
}
