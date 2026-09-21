import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import Ajv2020 from "ajv/dist/2020.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const adapterTargets = {
  claude: path.resolve(ROOT, "..", ".claude"),
  gemini: path.resolve(ROOT, "..", ".gemini"),
};

const schemaFiles = {
  agent: "schemas/agent.schema.json",
  skill: "schemas/skill.schema.json",
  workflow: "schemas/workflow.schema.json",
  evaluation: "schemas/evaluation.schema.json",
};

async function filesWithExtension(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await filesWithExtension(entryPath, extension));
    } else if (entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  }
  return files;
}

async function loadYamlFile(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  const value = YAML.parse(source);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected an object in ${path.relative(ROOT, filePath)}`);
  }
  return value;
}

export async function loadManifests() {
  const agentFiles = await filesWithExtension(path.join(ROOT, "agents"), ".yaml");
  const skillFiles = await filesWithExtension(path.join(ROOT, "skills"), ".yaml");
  const workflowFiles = await filesWithExtension(path.join(ROOT, "workflows"), ".yaml");
  const evaluationFiles = await filesWithExtension(path.join(ROOT, "evaluations"), ".yaml");
  const agents = await Promise.all(agentFiles.map(async (filePath) => ({
    filePath,
    manifest: await loadYamlFile(filePath),
  })));
  const skills = await Promise.all(skillFiles.map(async (filePath) => ({
    filePath,
    manifest: await loadYamlFile(filePath),
  })));
  const workflows = await Promise.all(workflowFiles.map(async (filePath) => ({
    filePath,
    manifest: await loadYamlFile(filePath),
  })));
  const evaluations = await Promise.all(evaluationFiles.map(async (filePath) => ({
    filePath,
    manifest: await loadYamlFile(filePath),
  })));
  return { agents, skills, workflows, evaluations };
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
}

export async function validateProject() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validators = {};
  for (const [kind, relativePath] of Object.entries(schemaFiles)) {
    const schema = JSON.parse(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
    validators[kind] = ajv.compile(schema);
  }

  const { agents, skills, workflows, evaluations } = await loadManifests();
  const failures = [];
  const ids = new Map();

  for (const { filePath, manifest } of agents) {
    if (!validators.agent(manifest)) {
      failures.push(`${path.relative(ROOT, filePath)}: ${formatAjvErrors(validators.agent.errors)}`);
    }
    if (ids.has(manifest.id)) {
      failures.push(`${path.relative(ROOT, filePath)}: duplicate id "${manifest.id}" also used by ${ids.get(manifest.id)}`);
    } else {
      ids.set(manifest.id, path.relative(ROOT, filePath));
    }
  }

  for (const { filePath, manifest } of skills) {
    if (!validators.skill(manifest)) {
      failures.push(`${path.relative(ROOT, filePath)}: ${formatAjvErrors(validators.skill.errors)}`);
    }
    if (ids.has(manifest.id)) {
      failures.push(`${path.relative(ROOT, filePath)}: duplicate id "${manifest.id}" also used by ${ids.get(manifest.id)}`);
    } else {
      ids.set(manifest.id, path.relative(ROOT, filePath));
    }
  }

  const skillIds = new Set(skills.map(({ manifest }) => manifest.id));
  const agentIds = new Set(agents.map(({ manifest }) => manifest.id));
  for (const { filePath, manifest } of agents) {
    for (const skillId of manifest.skills || []) {
      if (!skillIds.has(skillId)) {
        failures.push(`${path.relative(ROOT, filePath)}: unknown skill "${skillId}"`);
      }
    }
  }

  for (const { filePath, manifest } of workflows) {
    if (!validators.workflow(manifest)) {
      failures.push(`${path.relative(ROOT, filePath)}: ${formatAjvErrors(validators.workflow.errors)}`);
    }
    if (!agentIds.has(manifest.agent_id)) {
      failures.push(`${path.relative(ROOT, filePath)}: unknown agent "${manifest.agent_id}"`);
    }
    for (const schemaRef of [manifest.input_schema_ref, manifest.output_schema_ref]) {
      if (schemaRef && !(await fileExists(path.join(ROOT, schemaRef)))) {
        failures.push(`${path.relative(ROOT, filePath)}: missing schema reference "${schemaRef}"`);
      }
    }
  }

  for (const { filePath, manifest } of evaluations) {
    if (!validators.evaluation(manifest)) {
      failures.push(`${path.relative(ROOT, filePath)}: ${formatAjvErrors(validators.evaluation.errors)}`);
    }
    if (!agentIds.has(manifest.agent_id)) {
      failures.push(`${path.relative(ROOT, filePath)}: unknown agent "${manifest.agent_id}"`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Validation failed:\n- ${failures.join("\n- ")}`);
  }
  return { agents, skills, workflows, evaluations };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function renderSkill(skill, body = "") {
  const procedure = skill.procedure.map((item) => `${item.step}. **${item.action}**${item.details ? ` — ${item.details}` : ""}`).join("\n");
  const constraints = skill.constraints.map((item) => `- ${item}`).join("\n");
  return `# ${skill.name}\n\n${skill.description}\n\n## Purpose\n${skill.purpose}\n\n## Procedure\n${procedure}\n\n## Constraints\n${constraints}\n\n## Expected output\n${skill.expected_output.description}\n\n## Failure behavior\n- Missing input: ${skill.failure_behavior?.on_missing_input || "Report the missing input."}\n- Ambiguity: ${skill.failure_behavior?.on_ambiguity || "Report the ambiguity."}\n- Tool failure: ${skill.failure_behavior?.on_tool_failure || "Report the tool failure."}\n${body ? `\n${body}\n` : ""}`;
}

function renderAgent(agent, system, format) {
  const tools = agent.tool_policy.allowed.map((tool) => `- ${tool}`).join("\n");
  const skills = agent.skills.map((skill) => `- ${skill}`).join("\n");
  const policy = [
    `- Approval required: ${(agent.tool_policy.approval_required || []).join(", ") || "none"}`,
    `- Forbidden: ${(agent.tool_policy.forbidden || []).join(", ") || "none"}`,
    `- Iteration limit: ${agent.behavior.iteration_limit}`,
    `- Must validate: ${agent.behavior.must_validate}`,
    `- Must report blockers: ${agent.behavior.must_report_blockers}`,
  ].join("\n");
  const header = format === "gemini" ? `# Gemini Agent: ${agent.name}` : `# ${agent.name}`;
  return `${header}\n\n${agent.description}\n\n${system.trim()}\n\n## Assigned skills\n${skills}\n\n## Allowed tools\n${tools}\n\n## Execution policy\n${policy}\n\n## Output contract\nReturn a structured result with status, summary, result, validation, warnings, errors, and metadata.`;
}

async function resetDirectory(directory) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

export async function generate() {
  const { agents, skills } = await validateProject();
  const generated = {};
  for (const adapter of ["claude", "gemini"]) {
    const outputRoot = path.join(ROOT, "generated", adapter);
    await resetDirectory(outputRoot);
    const skillRoot = path.join(outputRoot, "skills");
    const agentRoot = path.join(outputRoot, "agents");
    await fs.mkdir(skillRoot, { recursive: true });
    await fs.mkdir(agentRoot, { recursive: true });

    for (const { manifest } of skills) {
      const skillText = renderSkill(manifest);
      const target = adapter === "claude"
        ? path.join(skillRoot, manifest.id, "SKILL.md")
        : path.join(skillRoot, `${manifest.id}.md`);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, `${skillText}\n`, "utf8");
    }
    for (const { filePath, manifest } of agents) {
      const systemPath = path.join(path.dirname(filePath), "system.md");
      const system = await fs.readFile(systemPath, "utf8");
      const target = path.join(agentRoot, `${manifest.id}.md`);
      await fs.writeFile(target, `${renderAgent(manifest, system, adapter)}\n`, "utf8");
    }
    await fs.writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      sourceVersion: "0.1.0",
      adapter,
      agents: agents.map(({ manifest }) => manifest.id),
      skills: skills.map(({ manifest }) => manifest.id),
    }, null, 2)}\n`, "utf8");
    generated[adapter] = outputRoot;
  }
  return generated;
}

async function copyDirectory(source, destination) {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(source, destination, { recursive: true });
}

export async function sync(adapter) {
  const adapters = adapter === "all" ? ["claude", "gemini"] : [adapter];
  for (const item of adapters) {
    if (!adapterTargets[item]) {
      throw new Error(`Unknown adapter "${item}". Expected claude, gemini, or all.`);
    }
  }
  await generate();
  for (const item of adapters) {
    await copyDirectory(path.join(ROOT, "generated", item), adapterTargets[item]);
  }
  return adapters.map((item) => ({ adapter: item, destination: adapterTargets[item] }));
}

export function getAdapterTarget(adapter) {
  return adapterTargets[adapter];
}
