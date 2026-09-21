import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, generate, validateProject } from "../src/core.js";

test("canonical manifests validate and skill references resolve", async () => {
  const result = await validateProject();
  assert.equal(result.agents.length, 4);
  assert.equal(result.skills.length, 9);
  assert.equal(result.workflows.length, 5);
  assert.equal(result.evaluations.length, 4);
});

test("generation creates both adapter outputs", async () => {
  const generated = await generate();
  for (const adapter of ["claude", "gemini"]) {
    const manifestPath = path.join(generated[adapter], "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    assert.deepEqual(manifest.agents, ["news-rundown", "personal-fitness-trainer", "project-planner", "research"]);
    assert.equal(manifest.skills.length, 9);
  }
  const claudeAgent = await fs.readFile(path.join(ROOT, "generated", "claude", "agents", "research.md"), "utf8");
  const geminiAgent = await fs.readFile(path.join(ROOT, "generated", "gemini", "agents", "research.md"), "utf8");
  assert.match(claudeAgent, /Research Specialist/);
  assert.match(geminiAgent, /Gemini Agent/);
  const fitnessAgent = await fs.readFile(path.join(ROOT, "generated", "claude", "agents", "personal-fitness-trainer.md"), "utf8");
  assert.match(fitnessAgent, /Personal Fitness Trainer/);
});
