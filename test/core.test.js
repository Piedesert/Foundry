import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, generate, validateProject } from "../src/core.js";

test("canonical manifests validate and skill references resolve", async () => {
  const result = await validateProject();
  assert.equal(result.agents.length, 6);
  assert.equal(result.skills.length, 11);
  assert.equal(result.workflows.length, 5);
  assert.equal(result.evaluations.length, 6);
});

test("generation creates all adapter outputs", async () => {
  const generated = await generate();
  for (const adapter of ["claude", "gemini", "chatgpt"]) {
    const manifestPath = path.join(generated[adapter], "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    assert.deepEqual(manifest.agents, ["agent-builder", "news-rundown", "personal-fitness-trainer", "project-planner", "research", "skill-builder"]);
    assert.equal(manifest.skills.length, 11);
  }
  const claudeAgent = await fs.readFile(path.join(ROOT, "generated", "claude", "agents", "research.md"), "utf8");
  const geminiAgent = await fs.readFile(path.join(ROOT, "generated", "gemini", "agents", "research.md"), "utf8");
  assert.match(claudeAgent, /Research Specialist/);
  assert.match(geminiAgent, /Gemini Agent/);
  const chatgptAgent = await fs.readFile(path.join(ROOT, "generated", "chatgpt", "agents", "research.md"), "utf8");
  assert.match(chatgptAgent, /ChatGPT\/Codex Agent/);
  const fitnessAgent = await fs.readFile(path.join(ROOT, "generated", "claude", "agents", "personal-fitness-trainer.md"), "utf8");
  assert.match(fitnessAgent, /Personal Fitness Trainer/);
  const foundryAgent = JSON.parse(await fs.readFile(path.join(ROOT, "generated", "foundry", "agents", "agent-builder.json"), "utf8"));
  assert.equal(foundryAgent.id, "agent-builder");
  assert.equal(foundryAgent.source, "agent-system");
  const skillBuilderAgent = await fs.readFile(path.join(ROOT, "generated", "chatgpt", "agents", "skill-builder.md"), "utf8");
  assert.match(skillBuilderAgent, /Skill Builder/);
});
