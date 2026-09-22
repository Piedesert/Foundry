#!/usr/bin/env node
import { generate, sync, validateProject } from "./core.js";

function usage() {
  return `Usage:
  agent-system validate
  agent-system generate
  agent-system sync <claude|gemini|chatgpt|all>`;
}

const [command, argument] = process.argv.slice(2);

try {
  if (command === "validate") {
    const result = await validateProject();
    console.log(`Valid: ${result.agents.length} agent(s), ${result.skills.length} skill(s).`);
  } else if (command === "generate") {
    const generated = await generate();
    for (const [adapter, directory] of Object.entries(generated)) {
      console.log(`Generated ${adapter}: ${directory}`);
    }
  } else if (command === "sync") {
    const result = await sync(argument || "all");
    for (const item of result) {
      console.log(`Synchronized ${item.adapter}: ${item.destination}`);
    }
  } else {
    console.error(usage());
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
