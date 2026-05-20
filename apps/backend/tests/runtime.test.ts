import { describe, expect, it } from "vitest";
import { SurveyRuntime, evaluateCondition, interpolatePiping } from "@survey/sdk";
import type { SurveyDocument, SurveySession } from "@survey/shared";

const sampleSurvey: SurveyDocument = {
  id: "survey_demo",
  title: "Demo Survey",
  blocks: [
    {
      id: "b1",
      title: "Intro",
      questions: [
        { id: "q1", type: "text", title: "What is your name?", required: true },
        {
          id: "q2",
          type: "multiple_choice",
          title: "How satisfied are you?",
          choices: [
            { id: "c1", value: "5", text: "Very satisfied" },
            { id: "c2", value: "1", text: "Very dissatisfied" },
          ],
        },
      ],
    },
    {
      id: "b2",
      title: "Follow-up",
      questions: [
        { id: "q3", type: "long_text", title: "Tell us why" },
      ],
    },
    {
      id: "b3",
      title: "Exit",
      questions: [{ id: "q4", type: "statement", title: "Thank you" }],
    },
  ],
  logic: [
    {
      id: "skip1",
      type: "skip_to_block",
      condition: {
        operator: "==",
        left: { type: "response", questionId: "q2" },
        right: { type: "value", value: "1" },
      },
      action: { skipToBlockId: "b3" },
    },
    {
      id: "display1",
      type: "display_logic",
      questionId: "q3",
      condition: {
        operator: "<=",
        left: { type: "response", questionId: "q2" },
        right: { type: "value", value: "3" },
      },
    },
  ],
  quotas: [],
  settings: {},
};

function freshSession(overrides: Partial<SurveySession> = {}): SurveySession {
  return {
    sessionId: "sess_1",
    surveyId: sampleSurvey.id,
    surveyVersion: 1,
    currentBlockId: null,
    currentQuestionId: null,
    answers: {},
    embeddedData: {},
    status: "started",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("evaluateCondition", () => {
  it("returns true for matching equality", () => {
    const result = evaluateCondition(
      {
        operator: "==",
        left: { type: "response", questionId: "q1" },
        right: { type: "value", value: "Tomas" },
      },
      { answers: { q1: "Tomas" }, embeddedData: {} },
    );
    expect(result).toBe(true);
  });

  it("supports AND composition", () => {
    const result = evaluateCondition(
      {
        operator: "==",
        left: { type: "value", value: "x" },
        all: [
          {
            operator: "==",
            left: { type: "response", questionId: "q1" },
            right: { type: "value", value: "a" },
          },
          {
            operator: "==",
            left: { type: "response", questionId: "q2" },
            right: { type: "value", value: "b" },
          },
        ],
      },
      { answers: { q1: "a", q2: "b" }, embeddedData: {} },
    );
    expect(result).toBe(true);
  });
});

describe("interpolatePiping", () => {
  it("substitutes placeholders with answers", () => {
    const out = interpolatePiping(
      "Hi {{q1}}, you said {{q2}}",
      [
        { placeholder: "{{q1}}", sourceQuestionId: "q1" },
        { placeholder: "{{q2}}", sourceQuestionId: "q2" },
      ],
      { q1: "Tomas", q2: "yes" },
    );
    expect(out).toBe("Hi Tomas, you said yes");
  });
});

describe("SurveyRuntime", () => {
  const runtime = new SurveyRuntime(sampleSurvey);

  it("returns first question of first block when session is fresh", () => {
    const next = runtime.getNextQuestion(freshSession({ currentBlockId: "b1" }));
    expect(next?.question.id).toBe("q1");
  });

  it("walks to next question in same block", () => {
    const next = runtime.getNextQuestion(
      freshSession({
        currentBlockId: "b1",
        currentQuestionId: "q1",
        answers: { q1: "Tomas" },
      }),
    );
    expect(next?.question.id).toBe("q2");
  });

  it("honors skip_to_block logic", () => {
    const next = runtime.getNextQuestion(
      freshSession({
        currentBlockId: "b1",
        currentQuestionId: "q2",
        answers: { q1: "Tomas", q2: "1" },
      }),
    );
    expect(next?.block.id).toBe("b3");
    expect(next?.question.id).toBe("q4");
  });

  it("hides questions that fail display_logic", () => {
    const session = freshSession({
      currentBlockId: "b1",
      currentQuestionId: "q2",
      answers: { q1: "Tomas", q2: "5" },
    });
    // q3 should be hidden because q2 == "5" which is NOT <= "3"
    expect(runtime.shouldDisplay("q3", session)).toBe(false);
    const next = runtime.getNextQuestion(session);
    expect(next?.question.id).toBe("q4"); // block b2 is skipped (q3 hidden), so b3
  });

  it("shows q3 when satisfaction is low", () => {
    const session = freshSession({
      currentBlockId: "b1",
      currentQuestionId: "q2",
      answers: { q1: "Tomas", q2: "2" },
    });
    expect(runtime.shouldDisplay("q3", session)).toBe(true);
  });

  it("validates required text answers", () => {
    expect(runtime.validateAnswer("q1", "")).toEqual([
      "This question is required",
    ]);
    expect(runtime.validateAnswer("q1", "Tomas")).toEqual([]);
  });

  // Regression: the runtime service must set currentQuestionId to the
  // just-answered question before asking for "next", otherwise the cursor
  // never advances past the first question.
  it("advances from q1 → q2 when cursor reflects the latest submission", () => {
    const sessionAfterQ1 = freshSession({
      currentBlockId: "b1",
      currentQuestionId: "q1",
      answers: { q1: "Alice" },
    });
    expect(runtime.getNextQuestion(sessionAfterQ1)?.question.id).toBe("q2");

    const sessionAfterQ2 = freshSession({
      currentBlockId: "b1",
      currentQuestionId: "q2",
      answers: { q1: "Alice", q2: "5" },
    });
    expect(runtime.getNextQuestion(sessionAfterQ2)?.question.id).toBe("q4");
  });
});
