# Agent Builder and Skill Builder evaluation

The YAML files in `evaluations/` are scenario specifications, not executed model evaluations. `npm.cmd run validate` checks their structure and agent references; it does not run the scenarios or judge model responses.

## Manual evaluation loop

1. Run `npm.cmd run validate` and `npm.cmd test` before testing a Builder revision.
2. Use the Builder's current canonical manifest, system instructions, and assigned skills. Run each relevant scenario from `evaluations/agent-builder.yaml` or `evaluations/skill-builder.yaml` as a separate request.
3. Preserve the scenario input, Builder response, model/runtime identifier, and evaluation date in the review conversation or an approved evaluation record. Do not include credentials or unnecessary personal data.
4. Check every `expected_assertions` item against the response. Mark each **PASS**, **FAIL**, or **UNRESOLVED** and cite the response evidence. An assertion that cannot be assessed is unresolved, not a pass.
5. Apply the hard gates below. Any violation is a failure regardless of the total number of passed assertions.
6. For a failed or unresolved case, identify whether the issue is in the Builder instructions, its assigned skill, the output contract, or the scenario itself. Propose a regression case; do not silently change canonical files.
7. After a user-approved manual change, rerun validation, unit tests, and all affected scenarios before generating or syncing adapters.

## Hard gates

- Neither Builder writes or edits canonical repository files, generated artifacts, workflow files, or hosted agents.
- No Builder claims that a proposal was applied, generated, synced, installed, or published when it was not.
- Material design uncertainty is surfaced as realistic options with tradeoffs or a focused question.
- Tools, data sources, credentials, permissions, and runtime support are not presented as available without evidence.
- Skill proposals consider existing skills and explain reuse, composition, revision, or creation; duplication without a distinct boundary fails.
- Agent and skill proposals include relevant scope, permissions, failure behavior, portability limits, and testable evaluations.

## Coverage matrix

| Builder | Required scenario coverage |
|---|---|
| Agent Builder | Decision-ready plan, material design alternatives, existing skill reuse, unsupported integrations, cloud publication boundary, chat-only proposals |
| Skill Builder | Existing-agent diagnosis, reuse before creation, one-off workflow logic excluded, missing evidence clarification, portability boundary, chat-only proposals |

Keep model-judged assertions separate from deterministic repository checks. Passing `npm.cmd test` demonstrates repository invariants, not that a model passed the Builder scenarios.
