import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import YAML from "yaml";
import { ROOT, generate, validateProject } from "../src/core.js";

test("canonical manifests validate and skill references resolve", async () => {
  const result = await validateProject();
  assert.equal(result.agents.length, 7);
  assert.equal(result.skills.length, 11);
  assert.equal(result.workflows.length, 9);
  assert.equal(result.evaluations.length, 7);
});

test("generation creates all adapter outputs", async () => {
  const generated = await generate();
  for (const adapter of ["claude", "gemini", "chatgpt"]) {
    const manifestPath = path.join(generated[adapter], "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    assert.deepEqual(manifest.agents, ["agent-builder", "finance", "news-rundown", "personal-fitness-trainer", "project-planner", "research", "skill-builder"]);
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
  assert.equal(foundryAgent.tools.includes("filesystem_write"), false);
  assert.ok(foundryAgent.forbidden.includes("filesystem_write"));
  const builderAdapter = await fs.readFile(path.join(ROOT, "generated", "chatgpt", "agents", "agent-builder.md"), "utf8");
  const allowedTools = builderAdapter.match(/## Allowed tools\n([\s\S]*?)\n## Execution policy/)?.[1] || "";
  assert.doesNotMatch(allowedTools, /filesystem_write/);
  assert.match(builderAdapter, /Never write or modify canonical files/);
  const skillBuilderAgent = await fs.readFile(path.join(ROOT, "generated", "chatgpt", "agents", "skill-builder.md"), "utf8");
  assert.match(skillBuilderAgent, /Skill Builder/);
  const financeAgent = await fs.readFile(path.join(ROOT, "generated", "claude", "agents", "finance.md"), "utf8");
  assert.match(financeAgent, /Financier/);
});

test("Builders are draft-only and their evaluation scenarios cover planning and improvement", async () => {
  const agentBuilder = YAML.parse(await fs.readFile(path.join(ROOT, "agents", "agent-builder", "agent.yaml"), "utf8"));
  const skillBuilder = YAML.parse(await fs.readFile(path.join(ROOT, "agents", "skill-builder", "agent.yaml"), "utf8"));
  for (const builder of [agentBuilder, skillBuilder]) {
    assert.equal(builder.tool_policy.allowed.includes("filesystem_write"), false);
    assert.ok(builder.tool_policy.forbidden.includes("filesystem_write"));
    assert.ok(builder.outputs.required.includes("plan"));
    assert.equal(builder.outputs.required.includes("agent_definition"), false);
    assert.equal(builder.outputs.required.includes("skill_definition"), false);
  }
  assert.equal(agentBuilder.inputs.properties.mode.default, "plan");
  assert.equal(skillBuilder.inputs.properties.mode.default, "design");
  assert.ok(agentBuilder.outputs.properties.agent_definition);
  assert.ok(skillBuilder.outputs.properties.skill_definition);
  assert.ok(skillBuilder.outputs.required.includes("affected_agents"));
  assert.ok(skillBuilder.outputs.properties.affected_agents);
  const agentInstructions = await fs.readFile(path.join(ROOT, "agents", "agent-builder", "system.md"), "utf8");
  const skillInstructions = await fs.readFile(path.join(ROOT, "agents", "skill-builder", "system.md"), "utf8");
  assert.match(agentInstructions, /Never write or modify canonical files/);
  assert.match(skillInstructions, /Never write or modify canonical files/);

  const agentEval = YAML.parse(await fs.readFile(path.join(ROOT, "evaluations", "agent-builder.yaml"), "utf8"));
  const skillEval = YAML.parse(await fs.readFile(path.join(ROOT, "evaluations", "skill-builder.yaml"), "utf8"));
  const agentScenarioIds = new Set(agentEval.scenarios.map(({ id }) => id));
  const skillScenarioIds = new Set(skillEval.scenarios.map(({ id }) => id));
  assert.ok(agentScenarioIds.has("material-design-options"));
  assert.ok(agentScenarioIds.has("builder-plan-is-read-only"));
  assert.ok(skillScenarioIds.has("improve-existing-agent"));
  assert.ok(skillScenarioIds.has("reuse-before-create"));
  assert.ok(skillScenarioIds.has("skill-proposal-is-read-only"));

  const procedure = await fs.readFile(path.join(ROOT, "docs", "builder-evaluation.md"), "utf8");
  assert.match(procedure, /not executed model evaluations/i);
  assert.match(procedure, /UNRESOLVED/);
});

test("fitness tracking contracts accept only explicit, confirmable tracker entries", async () => {
  const schemaDirectory = path.join(ROOT, "workflows", "n8n", "schemas");
  const trackerSchema = JSON.parse(await fs.readFile(path.join(schemaDirectory, "fitness-tracker-entry.schema.json"), "utf8"));
  const progressSchema = JSON.parse(await fs.readFile(path.join(schemaDirectory, "fitness-progress-entry.schema.json"), "utf8"));
  const resourceSchema = JSON.parse(await fs.readFile(path.join(schemaDirectory, "fitness-resource.schema.json"), "utf8"));
  const requestSchema = JSON.parse(await fs.readFile(path.join(schemaDirectory, "fitness-request.schema.json"), "utf8"));
  const resultSchema = JSON.parse(await fs.readFile(path.join(schemaDirectory, "fitness-result.schema.json"), "utf8"));
  const ajv = new Ajv2020({ strict: false });
  ajv.addSchema(trackerSchema);
  ajv.addSchema(progressSchema);
  ajv.addSchema(resourceSchema);
  const validateRequest = ajv.compile(requestSchema);
  const validateResult = ajv.compile(resultSchema);
  const request = {
    goal: "Track the workout I completed.",
    tracking_input: {
      destination: "workout_tracker",
      user_provided_values: { exercise: "Goblet squat", sets: 3 },
    },
  };
  assert.equal(validateRequest(request), true);
  assert.equal(validateRequest({
    ...request,
    tracking_input: { destination: "workout_tracker", user_provided_values: { sets: { estimated: 3 } } },
  }), false);
  assert.equal(validateResult({
    status: "success",
    summary: "Ready for review.",
    recommendations: [],
    safety: { level: "routine_guidance", limitations: [] },
    sources: [],
    tracker_proposal: {
      status: "awaiting_confirmation",
      destination: "workout_tracker",
      user_provided_values: { exercise: "Goblet squat", sets: 3 },
    },
  }), true);
  assert.equal(validateResult({
    status: "success",
    summary: "Already logged.",
    recommendations: [],
    safety: { level: "routine_guidance", limitations: [] },
    sources: [],
    tracker_proposal: {
      status: "written",
      destination: "workout_tracker",
      user_provided_values: { exercise: "Goblet squat", sets: 3 },
    },
  }), false);
});
