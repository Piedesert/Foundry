# Agent Governance Model

This model applies across agents, n8n workflows, direct chat entry points, and future harness adapters. It is designed for incremental trust: agents begin as observers or advisors and gain narrowly scoped execution privileges only after their outputs and failure paths are understood.

## Governing principles

1. **Reasoning is not authorization.** A convincing model response never grants permission to perform an action.
2. **Default deny.** A tool, credential, data source, or action not explicitly permitted is unavailable.
3. **Least privilege.** Grant the smallest scope, data access, and time window needed for the task.
4. **Draft before write.** The default path is to inspect, propose, and wait for approval.
5. **Approval must be specific.** Approval applies to a concrete proposed action, not an open-ended future plan.
6. **Every side effect is auditable.** Record what was proposed, approved, attempted, completed, skipped, or failed.
7. **Failures remain visible.** A partial or failed run must not be represented as successful empty output.
8. **Idempotence before autonomy.** An action should be safe to retry or have an explicit deduplication key and recovery plan.
9. **Human override remains available.** The owner can cancel, pause, or revoke access without relying on the agent.
10. **Separate persona from privilege.** Style and role framing never determine tool access.

## Permission ladder

Agents move through these stages independently for each capability. An agent may be trusted to execute one low-risk action while remaining draft-only for another.

| Level | Name | Allowed behavior | Human approval |
|---|---|---|---|
| 0 | Observe | Read permitted data and report facts | No action approval; data access still governed |
| 1 | Analyze | Interpret data, compare options, and identify uncertainty | No external side effect |
| 2 | Recommend | Propose a decision or change with evidence and impact | Required before execution |
| 3 | Draft | Prepare a message, command, file operation, task, or transaction without applying it | Required before application |
| 4 | Execute approved | Perform one explicitly approved action within stated scope | Approval must precede the action |
| 5 | Execute bounded | Perform pre-approved, low-risk, reversible actions under strict limits | Standing approval may be allowed only for documented low-risk actions |
| 6 | Verify and report | Confirm outcome, identify deviations, and record evidence | No additional approval for observation |

No first-wave agent needs Level 4 or higher.

## Action classification

Every tool operation should be classified before invocation:

### Read

Examples:

- Fetch a public source
- Read a repository diff
- Inspect a feed
- Read a project document
- Query service status

### Draft

Examples:

- Generate a proposed email
- Prepare a task list
- Produce a shell command
- Suggest a Jellyfin path
- Create a proposed itinerary

### Low-risk reversible write

Examples may include creating a private draft or adding a non-public execution note. These still require an explicit allowlist and must be idempotent.

### Consequential write

Examples:

- Send an external message
- Create or modify calendar events
- Create tickets or tasks in a shared system
- Move or rename media files
- Change infrastructure configuration
- Publish content

### High-consequence action

Examples:

- Place a trade
- Delete or overwrite files
- Change network access or firewall rules
- Modify production systems
- Provide individualized health instructions beyond defined scope

High-consequence actions require explicit, per-action confirmation and should remain outside autonomous execution.

## Approval contract

An approval request must include all of the following:

```text
APPROVAL_REQUIRED
request_id: unique identifier
agent: agent identifier and version
workflow: workflow identifier and version
proposed_action: exact action to be taken
target: system, record, file set, or account affected
scope: item count, paths, records, or boundaries
reason: why the action is needed
expected_effect: what should change
risks: known failure modes or side effects
rollback: how the action can be reversed, if possible
expires_at: approval expiration
```

Approval should bind to the `request_id`, target, and action digest. A later run may not reuse an old approval for a different action.

### Approval states

- `pending`
- `approved`
- `rejected`
- `expired`
- `cancelled`
- `executing`
- `completed`
- `partially_completed`
- `failed`

An approval should expire after a bounded interval. An expired approval must not be silently retried.

## Credential model

### Requirements

- Credentials live in n8n's credential store or a dedicated secret manager.
- No secret values appear in prompts, agent manifests, logs, outputs, or evaluation fixtures.
- Read and write credentials are separate whenever the provider allows it.
- Credentials are scoped per external system and, where practical, per agent family.
- A workflow receives only the credential references required for that run.
- Credential use is recorded by credential class or identifier, never by secret value.

### Suggested initial classes

| Credential class | First-wave use |
|---|---|
| Public retrieval | Deep Researcher and News Rundown |
| Private delivery | News Rundown, only after delivery target is explicitly configured |
| Project read-only | Optional Project Planner context |
| Project write | Deferred; approval required |
| Finance | Not granted to first wave |
| Infrastructure/NAS | Not granted to first wave |
| Health records | Not granted to first wave |

## Cross-agent handoff contract

Agents should communicate through a structured handoff rather than raw prose:

```json
{
  "handoff_id": "unique-id",
  "from_agent": {
    "id": "deep-researcher",
    "version": "0.1.0"
  },
  "to_agent": {
    "id": "business-advisor",
    "version": "0.1.0"
  },
  "task_completed": "What the sending agent finished",
  "deliverable": {},
  "context": [],
  "sources": [],
  "open_issues": [],
  "assumptions": [],
  "status": "complete",
  "confidence": "medium",
  "requested_next_action": "What the receiving agent should do"
}
```

### Handoff rules

- The receiver must verify that the handoff is addressed to it.
- The receiver must preserve `partial` or `blocked` status rather than treating it as complete.
- Claims must retain their source or provenance information.
- Open issues and assumptions must not be silently dropped.
- A handoff is input, not authorization to perform a side effect.
- The receiving agent must state when required context is missing.

## Execution envelope

Every n8n-triggered run should return:

```json
{
  "status": "success",
  "summary": "Human-readable result summary",
  "result": {},
  "validation": [],
  "warnings": [],
  "errors": [],
  "metadata": {
    "run_id": "unique-id",
    "agent": "agent-id",
    "agent_version": "0.1.0",
    "workflow": "workflow-id",
    "workflow_version": "0.1.0",
    "model": "provider/model",
    "started_at": "timestamp",
    "completed_at": "timestamp"
  }
}
```

### Status meanings

- `success`: Required work completed and output passed validation.
- `partial`: Useful output exists, but one or more requested elements are missing or unverified.
- `blocked`: Work cannot safely continue without user input, access, or approval.
- `failure`: The workflow could not produce a usable result.
- `cancelled`: A user or policy cancelled the run.

## Retry and recovery policy

### Retry only when

- The error is transient and known to be retryable.
- The request is idempotent or has a deduplication key.
- The retry count and total time budget are not exceeded.
- Retrying will not create duplicate external effects.

### Do not retry automatically when

- Authentication or authorization fails.
- A CAPTCHA, login wall, or policy block is encountered.
- Input validation fails.
- The operation is ambiguous.
- A write may have partially succeeded.
- The model has reached its step or tool budget.

### Recovery record

A failed or partial run should record:

- Last completed step
- Tool and endpoint involved
- Retry count
- Whether an external effect may have occurred
- Safe resume point
- Required human action

## Audit record

At minimum, record:

| Field | Purpose |
|---|---|
| `run_id` | Correlate all events in one execution |
| `request_id` | Correlate approval or external action |
| Agent/workflow versions | Reproduce behavior |
| Input reference | Identify input without exposing sensitive content unnecessarily |
| Tool/action | Understand what was called |
| Permission level | Verify authorization |
| Approval state | Establish whether an action was authorized |
| Outcome | Completed, skipped, partial, failed, or cancelled |
| Timestamps | Reconstruct order and duration |
| Error/warning | Diagnose failure |
| Evidence reference | Link to output, source, or verification result |

Logs should avoid storing full sensitive payloads by default. Use redaction and retention rules appropriate to the data class.

## First-wave governance decisions

### Deep Researcher

- Permission level: Observe/Analyze/Recommend.
- Allowed data: Public or explicitly supplied sources.
- Writes: None.
- Main controls: source provenance, step budget, no login/CAPTCHA looping.

### News Rundown

- Permission level: Observe/Analyze.
- Allowed data: Configured feeds, APIs, and public web sources.
- Writes: Optional private delivery only after configuration.
- Main controls: deduplication, freshness, maximum five stories, private delivery.

### Project Planner

- Permission level: Analyze/Recommend/Draft.
- Allowed data: User-provided context and optional project read-only data.
- Writes: No task, calendar, or project-system writes in MVP.
- Main controls: expose assumptions, dependencies, risks, and next actions.

## Escalation triggers

The agent must stop and return `blocked` when:

- Required information is missing and materially changes the result.
- The requested action exceeds the agent's permission level.
- The target or scope is ambiguous.
- A source conflict cannot be resolved.
- A write may have partially succeeded.
- A credential is missing, expired, or broader than policy permits.
- A tool response suggests destructive or irreversible consequences.
- The user request conflicts with safety, privacy, or system policy.

## Governance review checklist

Before increasing an agent's permission level:

- [ ] The output contract has been stable across representative runs.
- [ ] Failure and timeout behavior has been tested.
- [ ] Retry behavior cannot duplicate side effects.
- [ ] Credentials are scoped and separately revocable.
- [ ] Approval requests are specific and expire.
- [ ] Audit records are sufficient to reconstruct an execution.
- [ ] Rollback or recovery has been tested.
- [ ] At least one real failure has become a regression test.
- [ ] The new permission is narrower than the agent's broad conceptual role.
