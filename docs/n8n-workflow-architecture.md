# n8n Workflow Architecture Plan

This document translates the first-wave agent contracts into an n8n implementation strategy. It is a planning artifact, not an exported n8n workflow. The current n8n instance is reachable at the configured Tailscale endpoint but requires authentication.

## Planning assumptions

- n8n is the primary orchestration layer.
- Agent definitions and schemas in this repository remain the source of truth for behavior and contracts.
- n8n owns triggers, credentials, branching, retries, delivery, and execution history.
- The model/agent runtime owns reasoning, synthesis, and structured result generation.
- First-wave workflows are read-only or draft-only.
- External writes require explicit approval.
- Heavy processing should run outside n8n and be invoked through a bounded worker/API when needed.

## Recommended topology

```text
Trigger
  -> Normalize Request
  -> Validate Input
  -> Create Run Metadata
  -> Gather or Load Context
  -> Invoke Agent
  -> Parse Structured Result
  -> Validate Result Schema
  -> Persist Run Record
  -> Branch by Status
       success  -> Deliver
       partial  -> Deliver with warnings
       blocked  -> Request user input or approval
       failure  -> Retry or alert
```

Every workflow should preserve the distinction between orchestration and agent reasoning:

- n8n should not silently rewrite model output into success.
- The agent should not own n8n credentials.
- The workflow should not embed large, divergent copies of canonical prompts.
- A workflow should validate both its input and its returned result.

## Common n8n sub-workflows

Create reusable sub-workflows rather than copying the same nodes into every agent workflow.

### 1. `common-run-initialize`

Responsibilities:

- Generate `run_id` and `correlation_id`.
- Add agent ID/version and workflow ID/version.
- Record `started_at`.
- Normalize request metadata.
- Redact or hash sensitive identifiers before logging.

Suggested output:

```json
{
  "run_id": "uuid",
  "correlation_id": "uuid",
  "agent_id": "research",
  "agent_version": "0.1.0",
  "workflow_id": "deep-researcher",
  "workflow_version": "0.1.0",
  "started_at": "timestamp",
  "input": {}
}
```

### 2. `common-input-validation`

Responsibilities:

- Validate request shape against the canonical schema.
- Apply only documented defaults.
- Reject unknown or unsafe fields where appropriate.
- Return `blocked` for missing information that materially affects execution.

Do not use a Code node as an informal schema validator if a JSON Schema-capable node or service is available. If a Code node is used initially, keep the schema reference and test fixtures beside the workflow.

### 3. `common-agent-invoke`

Responsibilities:

- Call the chosen model/agent runtime.
- Pass canonical agent ID, version, task input, and available context.
- Enforce request timeout.
- Limit tool calls and total execution budget where the runtime supports it.
- Return raw response plus invocation metadata.

The invocation mechanism should be replaceable. Possible implementations:

1. n8n AI node or chain, if it can consume the generated agent instructions and return structured output.
2. HTTP Request to a small agent gateway.
3. Execute Command wrapper for a local CLI runtime.

The gateway approach is the most portable long-term option because it centralizes model-specific structured-output handling, but the first experiment can use the simplest reliable path.

### 4. `common-result-validate`

Responsibilities:

- Parse JSON without accepting markdown-wrapped JSON as valid by accident.
- Validate the result against the workflow's output schema.
- Preserve raw response for diagnostics, subject to retention policy.
- Mark invalid output as `failure` or `partial`, not success.

### 5. `common-run-finalize`

Responsibilities:

- Add `completed_at`, duration, and final status.
- Persist a compact audit record.
- Include warnings, errors, and evidence references.
- Route delivery and alerting based on status.

### 6. `common-approval-gate`

Responsibilities:

- Render an exact proposed action.
- Generate an approval request ID and action digest.
- Store expiration and target scope.
- Wait for explicit approval.
- Prevent a prior approval from being reused for a different action.

This is not required for the first three workflows' MVPs, but it should exist before adding calendar writes, task creation, media moves, infrastructure changes, or publishing.

## Credential architecture

Use n8n credentials rather than environment variables embedded in nodes or prompts.

### Initial credential groups

| Credential | Consumers | Scope |
|---|---|---|
| Public retrieval | Deep Researcher, News Rundown | Web/feed/API reads |
| Private delivery | News Rundown | One private destination |
| Project read-only | Project Planner | Optional project context |
| Agent runtime | All agent workflows | Model or gateway invocation |
| Run-state store | Common sub-workflows | Minimal execution and deduplication state |

Rules:

- Separate read and write credentials.
- Do not expose credential values to the model.
- Do not pass credential names as free-form model input.
- Keep finance, NAS, infrastructure, calendar-write, and health-record credentials out of the first wave.
- Record credential class, not secret content, in audit metadata.

## Workflow 1: Deep Researcher

### Purpose

Run a bounded research request and return source-backed findings.

### Trigger

Webhook or manual trigger during initial testing. Move to authenticated API invocation after the contract is stable.

### Node sequence

```text
Webhook / Manual Trigger
  -> common-run-initialize
  -> common-input-validation (research-request)
  -> Set research budget and source policy
  -> Invoke research agent
  -> common-result-validate (research-result)
  -> common-run-finalize
  -> Respond to Webhook / private delivery
```

### Required controls

- Maximum search/source budget.
- No retry for login walls or CAPTCHAs.
- Source URL and publisher retention.
- Claim confidence and citation requirements.
- Partial result when some sources fail.
- No external writes.

### First test cases

1. Normal topic with multiple available sources.
2. One blocked source.
3. Conflicting sources.
4. Missing topic.
5. Agent returns invalid JSON.
6. Agent reaches its source/tool budget.

## Workflow 2: News Rundown

### Purpose

Produce a private, scheduled digest of no more than five distinct current stories.

### Trigger

Schedule Trigger for production; manual trigger for test runs.

### Node sequence

```text
Schedule Trigger
  -> Load digest configuration
  -> common-run-initialize
  -> Build source requests
  -> Fetch RSS/API/search candidates
  -> Normalize candidate fields
  -> Deduplicate by canonical URL and event similarity
  -> Load recent story state
  -> Remove recently delivered duplicates
  -> Invoke news-rundown agent
  -> common-result-validate (news-rundown-result)
  -> Persist selected story fingerprints
  -> common-run-finalize
  -> Private delivery
```

### Candidate normalization

Every candidate should have:

```json
{
  "title": "string",
  "url": "string",
  "canonical_url": "string",
  "publisher": "string",
  "published_at": "timestamp or null",
  "excerpt": "string or null",
  "source_type": "rss|api|search",
  "retrieved_at": "timestamp"
}
```

### State

Start with a small table or n8n data store containing:

- Canonical URL or content fingerprint
- First seen time
- Last delivered time
- Digest run ID
- Topic

Do not build personalization or embeddings until duplicate handling and relevance ranking are useful without them.

### Delivery

Start with one private destination. Keep public posting as a separate workflow with a separate credential and approval path.

### First test cases

1. Five distinct stories from multiple sources.
2. Duplicate URLs.
3. Multiple reports of one event.
4. Missing publication timestamps.
5. Empty source response.
6. One source timeout.
7. More than five relevant candidates.

## Workflow 3: Project Planner

### Purpose

Return a draft project plan without creating tasks, events, or external commitments.

### Trigger

Webhook, form, or manual trigger.

### Node sequence

```text
Webhook / Form Trigger
  -> common-run-initialize
  -> common-input-validation (project-plan-request)
  -> Load optional project context
  -> Invoke project-planner agent
  -> common-result-validate (project-plan-result)
  -> common-run-finalize
  -> Respond with draft plan
```

### Required controls

- Explicit distinction between planned and completed work.
- Bounded number of deliverables.
- Dependency and parallelism fields.
- Risks and assumptions required.
- No task/calendar/project writes.
- `blocked` when the missing goal or decision materially changes the plan.

### First test cases

1. Clear goal with constraints.
2. Ambiguous goal requiring one clarification.
3. Missing goal.
4. Plan containing parallel tasks.
5. Plan with an unresolved dependency.
6. Agent claims a task is complete without evidence.
7. Invalid or incomplete structured output.

## Error handling

### Error categories

| Category | Example | Action |
|---|---|---|
| Input | Missing topic or goal | Return blocked; do not invoke agent |
| Authentication | Expired retrieval credential | Alert; do not retry repeatedly |
| Rate limit | Provider throttling | Bounded retry with backoff |
| Timeout | Source or model exceeds budget | Retry only if safe; otherwise partial/failure |
| Source block | Login wall or CAPTCHA | Skip source and report |
| Schema | Invalid agent result | Mark failure; preserve diagnostic response |
| Delivery | Private channel unavailable | Persist result and alert |
| Partial external effect | Unknown delivery state | Stop automatic retry and require review |

### Retry policy

- Deep Researcher: up to two attempts for transient retrieval/runtime failures.
- News Rundown: up to two attempts, with deduplication state protecting against repeat delivery.
- Project Planner: one attempt by default; retrying deterministic planning usually adds little value.

## Observability

At minimum, track:

- Run and correlation IDs
- Workflow and agent versions
- Trigger type
- Duration
- Status
- Model/runtime used
- Candidate count and selected count for News Rundown
- Source count and failed-source count for Research
- Deliverable count and blocked questions for Project Planner
- Retry count
- Delivery status

Avoid logging complete sensitive input or credentials. Use references, hashes, or redacted summaries.

## Versioning and change management

The repository and n8n workflow should version together conceptually:

- `agent_id` and `agent_version`
- `workflow_id` and `workflow_version`
- Input/output schema version
- Runtime/model identifier

When a contract changes:

1. Update the canonical schema and manifest.
2. Add or update evaluation cases.
3. Update the n8n workflow.
4. Run test fixtures.
5. Execute a manual smoke test.
6. Record the version in the run metadata.

Do not silently change a live workflow's output shape.

## Import and deployment strategy

### Initial development

- Build in a dedicated n8n project or folder.
- Use manual triggers.
- Use test delivery destinations.
- Pin representative fixture data.
- Keep production schedules disabled.

### Promotion

1. Validate canonical repository contracts.
2. Export the n8n workflow JSON.
3. Review credentials and environment-specific values.
4. Import or promote into the production project.
5. Enable schedule only after a manual run passes.
6. Observe several executions before expanding permissions.

Do not store credential values in exported workflow JSON.

## Endpoint and network considerations

The current endpoint uses HTTP and redirects to authenticated n8n sign-in. The browser reported that security headers such as Cross-Origin-Opener-Policy are ignored on an untrusted HTTP origin. For a long-lived deployment, prefer HTTPS through a Tailscale certificate, reverse proxy, or equivalent trusted transport.

The workflow planning does not require exposing n8n publicly. Prefer:

- Tailscale-only access.
- IP or identity restrictions where available.
- Strong n8n authentication.
- A separate webhook authentication strategy.
- No public unauthenticated execution endpoints.

## Recommended implementation sequence

### Phase A: n8n smoke path

- Confirm n8n version and available nodes.
- Create a manual trigger workflow.
- Pass a fixed request into the agent runtime.
- Validate a fixed structured response.
- Persist and return the execution envelope.

### Phase B: Deep Researcher

- Add bounded retrieval.
- Add source metadata.
- Add result validation.
- Exercise failure and partial-result branches.

### Phase C: Project Planner

- Add webhook/form input.
- Validate draft-only result.
- Add a review-friendly delivery format.

### Phase D: News Rundown

- Add one or two trusted sources.
- Add normalization and deduplication state.
- Add schedule and private delivery.
- Add freshness and duplicate regression cases.

### Phase E: Shared sub-workflows

- Extract initialization, validation, invocation, finalization, and approval sub-workflows after at least two workflows work end to end.
- Avoid prematurely abstracting nodes whose behavior has not stabilized.

## Decisions still needed before live workflow creation

1. Which model/runtime should n8n invoke first?
2. Should the first invocation use an n8n AI node, an HTTP agent gateway, or a local CLI wrapper?
3. What private delivery destination should News Rundown use?
4. Where should minimal run and deduplication state live?
5. Which n8n project/folder should hold development workflows?
6. Should n8n be upgraded to HTTPS before adding webhook triggers?
7. How should approval requests be delivered when future workflows gain write access?
