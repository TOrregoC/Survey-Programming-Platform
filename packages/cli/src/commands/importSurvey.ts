import { readFile } from "node:fs/promises";
import { validateSurveyDocument } from "@survey/shared";

export async function importSurveyCommand(args: string[]): Promise<void> {
  const [filePath] = args;
  if (!filePath) {
    console.error("Usage: survey import <file.json>");
    process.exit(1);
  }

  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  // Validate before uploading
  const result = validateSurveyDocument(parsed.structure ?? parsed);
  if (!result.success) {
    console.error("Survey JSON is invalid:");
    console.error(result.error.format());
    process.exit(1);
  }

  // TODO(impl): POST to /surveys with the parsed structure once auth is wired.
  console.log(`Validated survey "${parsed.title ?? "(untitled)"}"`);
  console.log("Upload to the platform via POST /surveys (not yet wired).");
}
