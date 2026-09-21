# First-Wave Dependency Map

This map describes the minimum dependencies for the selected first wave:

- Deep Researcher
- News Rundown
- Project Planner

It intentionally separates **required for a useful MVP** from **helpful later infrastructure**. A dependency should not be introduced merely because it could improve the long-term architecture.

## Dependency categories

| Category | Purpose | First-wave posture |
|---|---|---|
| Orchestration | Triggering, sequencing, retries, delivery, execution history | n8n is the primary orchestration layer |
| Model runtime | Reasoning, synthesis, classification, structured output | Keep provider-specific details behind the agent-system adapter |
| Retrieval | Web, feeds, documents, or project context | Start with explicit source inputs and bounded web/feed retrieval |
| State | Preferences, prior runs, feedback, deduplication, and progress | Use minimal state first; avoid introducing RAG before needed |
| Delivery | Returning results to the user | Start with one private delivery channel plus persisted execution output |
| Evaluation | Testing correctness and regressions | Use fixture inputs and scenario-based assertions |
| Governance | Permissions, approvals, audit, and failure handling | Read-only or draft-only by default |

## Shared dependency baseline

### Required for all three

1. **n8n runtime**
   - Workflow execution
   - Trigger handling
   - Retry and timeout configuration
   - Credential references
   - Execution history

2. **Agent invocation boundary**
   - A consistent way to call an agent from n8n.
   - This may initially be an HTTP endpoint, CLI wrapper, or model node with a generated prompt.
   - The boundary must accept structured input and return the common execution envelope.

3. **Execution envelope**
   - `status`
   - `summary`
   - `result`
   - `validation`
   - `warnings`
   - `errors`
   - `metadata`

4. **Failure policy**
   - Explicit timeout.
   - Bounded retries.
   - Structured partial or failure status.
   - No silent fallback to an empty successful result.

5. **Version metadata**
   - Agent ID and version.
   - Workflow ID and version.
   - Model/provider identifier when available.
   - Run or correlation ID.

6. **Evaluation fixtures**
   - Stable inputs.
   - Expected output properties.
   - Regression cases from user feedback.

## Deep Researcher dependency map

### Minimum useful MVP

| Dependency | Required behavior | MVP implementation |
|---|---|---|
| Research request schema | Topic, depth, focus areas | Existing `research-request` contract |
| Source retrieval | Fetch a bounded set of relevant sources | Web search/fetch or supplied URLs |
| Source provenance | Preserve URL, title, publisher, and relevance | Required source fields in output |
| Verification policy | Distinguish verified, unverified, and contradictory claims | Research system instructions plus validation |
| Step budget | Stop retrieval and synthesis predictably | Maximum source/search count |
| Structured output | Return parseable findings and citations | Existing execution envelope plus research result |
| Failure handling | Continue past unavailable sources without looping | Skip and report inaccessible sources |

### Helpful but not initially required

- Persistent source cache.
- Semantic search over previous research.
- Personal knowledge-base ingestion.
- Multi-model comparison.
- Browser automation for authenticated sites.
- Automatic claim-level fact checking from multiple models.

### Main blocker

The main blocker is not a vector database. It is a reliable retrieval boundary that can return source metadata and tolerate failed, blocked, stale, or contradictory sources.

## News Rundown dependency map

### Minimum useful MVP

| Dependency | Required behavior | MVP implementation |
|---|---|---|
| Scheduled trigger | Run on a predictable cadence | n8n schedule trigger |
| Source set | Define which feeds/searches are authoritative enough | Small explicit feed or query list |
| Collection | Gather candidate stories | RSS/API/search nodes |
| Normalization | Convert different sources to common fields | URL, title, timestamp, publisher, excerpt |
| Deduplication | Collapse duplicate or near-duplicate stories | Canonical URL plus title similarity |
| Ranking | Select the most relevant five stories | Transparent ranking criteria |
| Freshness | Avoid resurfacing stale stories | Publication and prior-run checks |
| Delivery | Send one private digest | Email, chat, or another private channel |
| Run state | Remember recently delivered items | Small persistent store |

### Helpful but not initially required

- Embedding-based similarity.
- Personalized topic learning.
- Sentiment or market-impact scoring.
- Cross-language translation.
- Automated public posting.
- Multiple editions per day.
- News archive search.

### Main blocker

The main blocker is source quality and deduplication, not the language model. A polished summary of duplicated or low-quality stories is still a poor rundown.

## Project Planner dependency map

### Minimum useful MVP

| Dependency | Required behavior | MVP implementation |
|---|---|---|
| Planning request schema | Goal, constraints, deadline, available resources | Structured form or webhook payload |
| Clarification policy | Ask only for information that changes the plan | Bounded clarification questions |
| Decomposition | Break goal into bounded tasks | Maximum task count and clear deliverables |
| Dependency mapping | Identify prerequisites and parallel work | Explicit dependency list |
| Risk analysis | Surface assumptions, blockers, and risks | Required plan sections |
| Structured output | Make the plan reusable by a person or later workflow | Plan schema with tasks and dependencies |
| No-write boundary | Avoid silently creating tasks or events | Draft-only output |

### Helpful but not initially required

- Calendar integration.
- Project-management system integration.
- Automatic task creation.
- Progress memory.
- Status polling.
- Multi-agent task execution.
- Critical-path calculations beyond basic dependency ordering.

### Main blocker

The main blocker is not task-system integration. It is agreeing on a plan format that is useful enough to execute and explicit enough to distinguish assumptions from commitments.

## Shared n8n workflow pattern

The three agents can use the following common wrapper:

```text
Trigger
→ Create correlation ID
→ Validate input
→ Load minimal context
→ Call agent
→ Validate structured output
→ Persist execution summary
→ Route success / partial / failure
→ Deliver result
```

### Required branches

#### Success

- Persist result and metadata.
- Deliver the result.
- Record source or planning evidence.

#### Partial

- Persist the partial result.
- Include missing inputs, unavailable sources, or unresolved questions.
- Deliver only if the output remains useful.

#### Failure

- Persist errors and correlation ID.
- Do not convert the failure to an empty success.
- Retry only when the failure class is retryable.
- Surface the failure to the owner.

## State strategy

### Start with three small state categories

1. **Configuration state**
   - Source lists
   - Delivery preferences
   - Digest schedule
   - Ranking preferences

2. **Execution state**
   - Run ID
   - Workflow and agent versions
   - Status
   - Start/end time
   - Error or warning details

3. **User feedback state**
   - Corrections
   - Preferred output length
   - Relevance feedback
   - Regression examples

### Defer broad memory

Do not build a general-purpose personal memory or RAG system for the first wave unless a concrete workflow fails because it cannot retrieve prior context. Persistent state should begin narrowly and have an owner, retention expectation, and deletion path.

## Credential and access boundaries

### Initial access levels

| Agent | Read access | Write access | Approval |
|---|---|---|---|
| Deep Researcher | Public web or explicitly supplied sources | None | Not normally required |
| News Rundown | Feeds, APIs, public web | Private delivery only if explicitly enabled | Delivery preference can be configured; public posting requires approval |
| Project Planner | User-provided context and optional read-only project data | None in MVP | Required before task/calendar creation |

### Credential rules

- Store credentials in n8n or an external secret manager, not in prompts or repository files.
- Prefer one credential per external system rather than one credential shared across unrelated agents.
- Keep read and write credentials separate.
- Do not give the first wave access to finance, NAS, production systems, or personal health records.
- Record which credential class was used in execution metadata without exposing secrets.

## Dependency readiness checklist

Before implementing a workflow, confirm:

- [ ] The input contract is defined.
- [ ] The output contract is defined.
- [ ] The source or context boundary is known.
- [ ] The maximum work budget is defined.
- [ ] Retryable and non-retryable failures are distinguished.
- [ ] The result can be verified by inspection or assertions.
- [ ] The delivery target is private and reversible.
- [ ] Required credentials are available and scoped.
- [ ] No write access is needed for the MVP.
- [ ] The workflow records agent, workflow, model, and run versions.

## What this map deliberately avoids

- Choosing a permanent database or vector store.
- Granting autonomous external writes.
- Treating n8n as the runtime for heavy media processing.
- Designing a universal memory system before there is a demonstrated retrieval need.
- Assuming every model provider will produce identical tool behavior.
