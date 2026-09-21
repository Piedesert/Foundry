# Personal Fitness Trainer

The Personal Fitness Trainer is a canonical, read-only coaching agent for routine building, exercise substitutions, progression, recovery, general nutrition habits, and progress tracking.

## Supported context

Requests can provide:

- A goal
- Available equipment and schedule
- Routine preferences and exclusions
- Current training state and explicitly stated limitations
- User-provided progress entries and check-ins
- Multiple retrieved resources, including PDFs, articles, books, training notes, and logs

Retrieved resources use [fitness-resource.schema.json](../workflows/n8n/schemas/fitness-resource.schema.json) and retain a source ID, source type, title, content, locator, relevance, and whether the source is user-specific. The agent must cite resources it uses and must not imply that unavailable resources were consulted.

## Resource and safety precedence

The agent applies this order:

1. Safety constraints and explicit user limitations
2. Current user-provided facts and progress entries
3. Retrieved resources with identifiable provenance
4. General coaching heuristics

Conflicting resources are disclosed and resolved conservatively. The agent does not diagnose conditions or injuries, prescribe treatment or medication changes, or provide clinical nutrition. Worsening or concerning symptoms should trigger conservative guidance or professional review rather than a more aggressive plan.

## Progress tracking

Progress history uses [fitness-progress-entry.schema.json](../workflows/n8n/schemas/fitness-progress-entry.schema.json). The agent separates observations from interpretations and recommendations, then returns `proposed_log_entries` for user review. This release defines the future-compatible shape but does not persist entries, connect to a tracker, or implement a vector database.

## Invocation

The [personal-fitness-trainer workflow contract](../workflows/n8n/personal-fitness-trainer.yaml) accepts the [fitness request schema](../workflows/n8n/schemas/fitness-request.schema.json) and returns the [fitness result schema](../workflows/n8n/schemas/fitness-result.schema.json). It is bounded, webhook-oriented, and returns structured errors rather than treating an invalid or unsafe response as success.
