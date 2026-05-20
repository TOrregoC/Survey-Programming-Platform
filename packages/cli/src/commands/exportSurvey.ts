import { writeFile } from "node:fs/promises";
import { SurveyClient } from "@survey/sdk";

export async function exportSurveyCommand(args: string[]): Promise<void> {
  const [surveyId, outFlag, outPath] = args;
  if (!surveyId || outFlag !== "--out" || !outPath) {
    console.error("Usage: survey export <surveyId> --out <file.json>");
    process.exit(1);
  }

  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:5000";
  const apiKey = process.env.SURVEY_API_KEY;
  const client = new SurveyClient({ baseUrl, apiKey });

  const survey = await client.getSurvey(surveyId);
  await writeFile(outPath, JSON.stringify(survey, null, 2), "utf-8");
  console.log(`Exported survey ${surveyId} → ${outPath}`);
}
