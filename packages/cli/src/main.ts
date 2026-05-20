#!/usr/bin/env node
import { exportSurveyCommand } from "./commands/exportSurvey";
import { importSurveyCommand } from "./commands/importSurvey";
import { validateSurveyCommand } from "./commands/validateSurvey";

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "export":
      return exportSurveyCommand(args);
    case "import":
      return importSurveyCommand(args);
    case "validate":
      return validateSurveyCommand(args);
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
Survey Platform CLI

Usage:
  survey export <surveyId> --out <file.json>
  survey import <file.json>
  survey validate <file.json>
  survey help
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
