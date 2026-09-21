# Agent System

Universal, iterative agent and skill definitions with generated adapters for Claude Code, Gemini CLI, and n8n workflows.

## Source of truth

Author agent manifests under `agents/`, reusable skills under `skills/`, and contracts under `schemas/`. The `generated/` directory is build output and is intentionally ignored by Git.

Generated Claude and Gemini files are synchronized to sibling directories:

- `..\.claude` (the `.claude` directory beside this repository)
- `..\.gemini` (the `.gemini` directory beside this repository)

## Commands

Run from this directory:

```text
npm install
npm run validate
npm run generate
npm run sync
npm run sync:claude
npm run sync:gemini
npm test
```

`validate` checks every agent and skill against its JSON Schema and verifies that agent skill references resolve. `generate` validates first and then renders deterministic adapter files. `sync` regenerates and replaces only the generated adapter destination for the selected harness.

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
