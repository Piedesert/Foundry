# Agent System

Universal, iterative agent and skill definitions with generated adapters for Claude Code, Gemini CLI, ChatGPT/Codex CLI, Microsoft Foundry export, and n8n workflows.

## Source of truth

Author agent manifests under `agents/`, reusable skills under `skills/`, and contracts under `schemas/`. The `generated/` directory is build output and is intentionally ignored by Git.

Generated Claude, Gemini, and ChatGPT/Codex files are synchronized to sibling directories:

- `..\.claude` (the `.claude` directory beside this repository)
- `..\.gemini` (the `.gemini` directory beside this repository)
- `..\.chatgpt` (the `.chatgpt` directory beside this repository)

Microsoft Foundry artifacts are generated under `generated/foundry/` as portable JSON exports. Publishing to a Foundry project remains an explicit, credentialed deployment step.

## Commands

Run from this directory:

```text
npm install
npm run validate
npm run generate
npm run sync
npm run sync:claude
npm run sync:gemini
npm run sync:chatgpt
npm test
```

`validate` checks every agent and skill against its JSON Schema and verifies that agent skill references resolve. `generate` validates first and then renders deterministic adapter files plus a Foundry export. `sync` regenerates and replaces only the generated adapter destination for the selected harness.

## Adapter layout

Claude output uses:

```text
.claude/
├── agents/<agent-id>.md
└── skills/<skill-id>/SKILL.md
```

Gemini output uses:

```text
.gemini/
├── agents/<agent-id>.md
└── skills/<skill-id>.md
```

Both adapters include a `manifest.json` identifying the generated source version.

ChatGPT/Codex output uses:

```text
.chatgpt/
├── agents/<agent-id>.md
└── skills/<skill-id>.md
```

The official OpenAI terminal tool is Codex CLI. Install it separately with `npm install -g @openai/codex`, then run `codex` from a project directory. The generated `.chatgpt` files are local instruction artifacts; they do not create a hosted ChatGPT GPT automatically.

## n8n

Workflow contracts live under `workflows/n8n/`. They define the agent, input and output schema references, retry policy, and failure behavior. Keep n8n node prompts thin and make them consume these stable contracts.

## Planning

The current portfolio analysis is documented in [docs/portfolio-matrix.md](docs/portfolio-matrix.md). It is intentionally provisional: use it to compare personal value, effort, risk, reuse, dependencies, and safe first MVPs before selecting the next agents to implement.

The selected first-wave portfolio and its boundaries are documented in [docs/first-wave-selection.md](docs/first-wave-selection.md).

The dependency analysis for the first wave is documented in [docs/first-wave-dependency-map.md](docs/first-wave-dependency-map.md).

The cross-agent permission, approval, handoff, retry, and audit rules are documented in [docs/governance-model.md](docs/governance-model.md).

The n8n-specific topology, sub-workflows, node sequences, error handling, deployment process, and open decisions are documented in [docs/n8n-workflow-architecture.md](docs/n8n-workflow-architecture.md).

For a concise cross-session summary of implementation status, decisions, n8n observations, and the next action, see [docs/session-handoff.md](docs/session-handoff.md).

## Adding an agent

1. Add `<agent-id>/agent.yaml` and a sibling `system.md` under `agents/`.
2. Reference only existing skill IDs.
3. Add evaluation scenarios under `evaluations/`.
4. Run `npm run validate`, `npm run generate`, and `npm test`.
5. Review generated adapter changes before running `npm run sync`.

## Agent Builder

The `agent-builder` agent is the recommended starting point for new developer, videography, editing, and personal productivity capabilities. Give it a recurring problem and desired outcomes; it should produce a bounded agent, reusable skills, contracts, permissions, evaluations, and next actions. Keep the canonical definitions under `agents/` and `skills/`, then generate the platform adapters.

## Skill Builder

The `skill-builder` agent is for repeatable capabilities that should be shared by multiple agents or runtimes. It checks for overlap with existing skills, defines a provider-neutral contract and procedure, reviews portability across Claude, Gemini, ChatGPT/Codex, Microsoft Foundry, and workflow consumers, and proposes evaluations before adapter generation.
