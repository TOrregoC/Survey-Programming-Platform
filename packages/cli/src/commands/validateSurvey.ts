import { readFile } from "node:fs/promises";
import { validateSurveyDocument } from "@survey/shared";

export async function validateSurveyCommand(args: string[]): Promise<void> {
  const [filePath] = args;
  if (!filePath) {
    console.error("Usage: survey validate <file.json>");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const candidate = parsed.structure ?? parsed;

  const result = validateSurveyDocument(candidate);
  if (!result.success) {
    console.error("Invalid survey JSON:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  console.log("Survey JSON is valid.");
}
