import type {
  AnswerValue,
  LogicCondition,
  LogicOperand,
} from "@survey/shared";

/**
 * Evaluate a single logic condition against a response set.
 * Supports composition via `all` (AND) and `any` (OR) groups.
 */
export function evaluateCondition(
  condition: LogicCondition,
  context: {
    answers: Record<string, AnswerValue>;
    embeddedData: Record<string, string | number | boolean>;
  },
): boolean {
  if (condition.all && condition.all.length > 0) {
    return condition.all.every((c) => evaluateCondition(c, context));
  }
  if (condition.any && condition.any.length > 0) {
    return condition.any.some((c) => evaluateCondition(c, context));
  }

  const leftValue = resolveOperand(condition.left, context);
  const rightValue = condition.right
    ? resolveOperand(condition.right, context)
    : undefined;

  switch (condition.operator) {
    case "==":
      return looseEq(leftValue, rightValue);
    case "!=":
      return !looseEq(leftValue, rightValue);
    case ">":
      return Number(leftValue) > Number(rightValue);
    case ">=":
      return Number(leftValue) >= Number(rightValue);
    case "<":
      return Number(leftValue) < Number(rightValue);
    case "<=":
      return Number(leftValue) <= Number(rightValue);
    case "in":
      return Array.isArray(rightValue)
        ? rightValue.includes(leftValue as never)
        : false;
    case "not_in":
      return Array.isArray(rightValue)
        ? !rightValue.includes(leftValue as never)
        : false;
    case "contains":
      if (Array.isArray(leftValue)) {
        return leftValue.includes(rightValue as never);
      }
      return String(leftValue ?? "").includes(String(rightValue ?? ""));
    case "not_contains":
      if (Array.isArray(leftValue)) {
        return !leftValue.includes(rightValue as never);
      }
      return !String(leftValue ?? "").includes(String(rightValue ?? ""));
    case "is_empty":
      return isEmpty(leftValue);
    case "is_not_empty":
      return !isEmpty(leftValue);
    default:
      return false;
  }
}

function resolveOperand(
  operand: LogicOperand,
  context: {
    answers: Record<string, AnswerValue>;
    embeddedData: Record<string, string | number | boolean>;
  },
): unknown {
  switch (operand.type) {
    case "response":
      return context.answers[operand.questionId];
    case "value":
      return operand.value;
    case "embedded":
      return context.embeddedData[operand.key];
  }
}

function looseEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Interpolate piped values into a text string.
 * Example: "Hi {{q-1}}!" → "Hi Tomas!" if answers["q-1"] === "Tomas"
 */
export function interpolatePiping(
  text: string,
  pipes: Array<{ placeholder: string; sourceQuestionId: string }>,
  answers: Record<string, AnswerValue>,
): string {
  return pipes.reduce((acc, pipe) => {
    const value = answers[pipe.sourceQuestionId];
    const rendered = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return acc.split(pipe.placeholder).join(rendered);
  }, text);
}
