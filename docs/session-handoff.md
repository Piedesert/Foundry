# Agent System Session Handoff

Use this document to resume work in a new session without rereading the entire planning history.

## Project location

Central source-of-truth repository:

`C:\Users\nickg\OneDrive\Documents\Code\AI\agent_system`

Generated harness outputs are synchronized to sibling directories:

- `C:\Users\nickg\OneDrive\Documents\Code\AI\.claude`
- `C:\Users\nickg\OneDrive\Documents\Code\AI\.gemini`

## Current implementation status

The repository currently contains:

- 3 canonical agents:
  - `research`
  - `news-rundown`
  - `project-planner`
- 5 reusable skills:
  - `source-verification`
  - `iterative-refinement`
  - `structured-output`
  - `news-ranking`
  - `planning-decomposition`
- JSON Schemas for agents, skills, workflows, evaluations, request payloads, result payloads, and execution envelopes.
- 4 n8n workflow contracts:
  - `deep-researcher`
  - `research-and-verify`
  - `news-rundown`
  - `project-planner`
- 3 evaluation datasets:
  - Research
  - News Rundown
  - Project Planner
- Claude and Gemini adapter generation and synchronization.
- Validator checks for:
  - Agent and skill schemas
  - Workflow and evaluation schemas
  - Agent-to-skill references
  - Workflow-to-agent references
  - Workflow schema-file references
  - Duplicate IDs

## Verification status

Last verified from `agent_system`:

```text
npm run validate
Valid: 3 agent(s), 5 skill(s).

npm test
2 tests passed, 0 failed
```

Useful commands:

```text
npm run validate
npm test
npm run generate
npm run sync
npm run sync:claude
npm run sync:gemini
```

Generated output is ignored by Git. The repository itself has not been committed yet.

## Strategic decisions

### First-wave portfolio

The selected first wave is:

1. Deep Researcher, implemented initially through the `research` agent.
2. News Rundown, a scheduled source-backed digest.
3. Project Planner, a draft-only planning assistant.

### Shared architecture

n8n is the primary orchestration layer. The canonical repository owns agent behavior, skills, schemas, and evaluations. n8n should own:

- Triggers
- Credentials
- Branching
- Retries and timeouts
- Delivery
- Execution history
- Minimal workflow state

The model/agent runtime should own reasoning, synthesis, and structured result generation.

### Security posture

All first-wave agents are read-only or draft-only:

- No autonomous finance actions
- No NAS or infrastructure access
- No health-record access
- No task/calendar/project writes
- No public publishing
- Private delivery only when explicitly configured

Permission ladder:

```text
Observe → Analyze → Recommend → Draft → Execute approved → Execute bounded → Verify
```

No first-wave agent needs Level 4 or higher.

## Relevant files

Planning:

- [Portfolio matrix](./portfolio-matrix.md)
- [First-wave selection](./first-wave-selection.md)
- [Dependency map](./first-wave-dependency-map.md)
- [Governance model](./governance-model.md)
- [n8n workflow architecture](./n8n-workflow-architecture.md)

Canonical agents:

- `agents/research/`
- `agents/news-rundown/`
- `agents/project-planner/`

n8n contracts:

- `workflows/n8n/deep-researcher.yaml`
- `workflows/n8n/news-rundown.yaml`
- `workflows/n8n/project-planner.yaml`
- `workflows/n8n/research-and-verify.yaml`

## Current n8n integration target

n8n endpoint:

`http://n8n.wampus-diminished.ts.net:5678/home/workflows`

Target workflow:

- Name: `News Room`
- Workflow ID observed in the browser URL: `sQRRRrQ7IFzMj7h5`
- Project: `Personal`

### Observed current News Room structure

News path:

```text
Schedule Trigger ─┐
                  ├→ RSS Read → Limit → Basic LLM Chain → Edit Fields → Discord
Manual Trigger ───┘
```

Separate branch:

```text
Manual Trigger → Execute Command Plus → Basic LLM Chain1
```

The separate branch checks internet status and uses an Ollama model with an Eddie Murphy-style response. It should remain untouched.

The existing RSS path:

- Reads `https://www.bleepingcomputer.com/feed/`
- Limits items
- Summarizes each article independently with a Basic LLM Chain
- Uses Ollama
- Sends through Discord

There is also an unfinished `RSS Read1` node with no URL. Do not use it unless the owner explicitly decides what it is for.

## Intended News Rundown integration

Replace only the RSS/news branch behavior:

```text
Schedule/Manual Trigger
→ RSS Read
→ Normalize RSS candidates
→ Deduplicate
→ Limit/aggregate candidate set
→ Invoke News Rundown agent
→ Validate structured result
→ Format private Discord digest
→ Send
```

The important behavioral change is from:

```text
one article → one summary
```

to:

```text
candidate set → one bounded digest of up to five distinct stories
```

Preserve the existing internet-status branch.

## n8n access issue

The workflow canvas was visible in the shared browser session, but the underlying n8n API repeatedly returned:

```text
401 Unauthorized
```

Observed endpoints:

```text
/rest/workflows/sQRRRrQ7IFzMj7h5
/rest/executions?workflowId=sQRRRrQ7IFzMj7h5
```

Executing the RSS node also failed with `Unauthorized`.

Therefore:

- No n8n workflow was modified.
- No workflow was saved or published.
- No live RSS payload was inspected.
- No credentials were requested or handled in chat.

The next session should first verify that the shared browser session has a valid authenticated n8n API state.

## Exact next action

After n8n authentication is working:

1. Read the `RSS Read` node output using a manual execution.
2. Confirm actual field names for title, URL, publication date, content, and publisher.
3. Inspect the existing `Limit`, `Basic LLM Chain`, `Edit Fields`, and `Discord` node parameters.
4. Decide whether to edit the existing workflow in place or duplicate it as a development version.
5. Preserve the internet-status branch.
6. Normalize RSS items into the News Rundown input shape.
7. Aggregate candidates before the model call.
8. Configure the Ollama-backed chain with the canonical News Rundown instructions and structured output.
9. Validate the result before Discord delivery.
10. Run manually with a test Discord destination before enabling the schedule.

## Open decisions

Before modifying the live workflow, confirm:

- Whether to edit `News Room` in place or duplicate it for development.
- Whether the current Ollama model is sufficient for structured News Rundown output.
- The desired maximum number of RSS candidates before ranking.
- The desired digest limit, currently planned as five stories.
- Whether Discord should receive a private test message first.
- Where deduplication state should live: n8n Data Table, workflow static data, or another small store.
- Whether n8n should be moved to HTTPS before adding webhook-based integrations.

## Avoid for now

- Rewriting the whole News Room workflow.
- Changing the internet-status branch.
- Adding public publishing.
- Adding vector search or broad memory.
- Adding new credentials unnecessarily.
- Giving the News Rundown agent autonomous external write access.
- Treating a successful model response as valid without schema validation.
