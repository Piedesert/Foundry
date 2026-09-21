# Personal Agent Portfolio Matrix

This is a planning tool, not a fixed build order. Ratings are provisional and should be updated after real usage, infrastructure discovery, and small experiments.

## Rating scale

- **Value:** 1 = occasional/nice to have, 5 = frequent and materially useful.
- **MVP effort:** 1 = prompt plus light integration, 5 = substantial system or processing pipeline.
- **Risk:** 1 = low consequence if wrong, 5 = financial, health, security, privacy, or destructive-operation consequence.
- **Reuse:** 1 = mostly bespoke, 5 = creates capabilities useful to many other agents.
- **Verification:** 1 = easy to check, 5 = difficult or subjective to verify.

## Portfolio matrix

| Agent | Family | Value | MVP effort | Risk | Reuse | Verification | Key dependencies | Safe first MVP | Likely shared infrastructure |
|---|---|---:|---:|---:|---:|---:|---|---|---|
| Financier | Knowledge / decision | 4 | 3 | 5 | 4 | 4 | Fresh market/news data, watchlists, source provenance, portfolio context | Read-only market and watchlist briefing with timestamps and uncertainty | Scheduled research, data freshness, citations, approval gates |
| Code Reviewer | Software / operations | 5 | 2 | 3 | 5 | 2 | Repository access, diffs, test output | Review a supplied diff and produce findings with severity and evidence | Structured review output, iterative refinement, repository inspection |
| Development Leader | Software / operations | 5 | 4 | 4 | 5 | 3 | Code tools, test runner, issue context, approval workflow | Plan and critique a proposed change; no direct writes | Task decomposition, handoffs, validation, approval gates |
| Media Manager | Media / content | 4 | 5 | 4 | 4 | 3 | DVD tooling, codecs, NAS, metadata providers, duplicate detection | Inspect and propose Jellyfin names/locations; approval before moves | File intake, metadata extraction, idempotent file operations |
| Project Planner | Knowledge / planning | 5 | 2 | 2 | 5 | 2 | Task storage, calendar/project context | Turn a goal into bounded tasks, dependencies, risks, and next action | Planning, decomposition, handoffs, structured outputs |
| Travel Advisor | Knowledge / decision | 4 | 3 | 2 | 3 | 3 | Web research, dates, budget, preferences, possibly booking APIs | Research itinerary options with source links; no bookings | Research, ranking, preference state, approval |
| System Administrator | Software / operations | 4 | 4 | 5 | 5 | 3 | Inventory, observability, command execution, secrets, rollback | Read-only diagnostics and proposed commands | Permission ladder, command previews, audit logs, verification |
| Self-Hosting / Home Lab Expert | Software / operations | 4 | 4 | 5 | 5 | 3 | Network inventory, service APIs, logs, credentials | Explain observed status and recommend changes | Infrastructure inventory, diagnostics, safe execution |
| Script Writer / Editor | Media / content | 4 | 2 | 1 | 3 | 3 | Style references, briefs, optional transcript/context | Expand an idea into a structured script and storyboard | Creative templates, iterative refinement, artifact storage |
| Graphic Design Expert | Media / content | 3 | 3 | 2 | 3 | 4 | Image generation/editing tools, brand assets, visual references | Critique a design brief and produce layout/asset direction | Asset metadata, review loops, style/profile context |
| Personal Assistant (Cortana) | Persona / router | 5 | 3 | 3 | 5 | 3 | Calendar, tasks, notes, notifications, routing policy | Conversational router that drafts actions and asks for approval | Identity, routing, memory, approval, notification |
| Business Advisor | Knowledge / decision | 3 | 3 | 3 | 4 | 3 | Business context, documents, metrics, source verification | Analyze a business question and present options/tradeoffs | Research, document retrieval, planning, decision records |
| Deep Researcher | Knowledge / decision | 5 | 2 | 2 | 5 | 2 | Search/fetch, source handling, citation format | Bounded research with source count, fallback, and stop conditions | Research, source verification, structured output |
| News Rundown | Knowledge / monitoring | 4 | 2 | 2 | 4 | 2 | Feeds/search, deduplication, ranking, scheduled delivery | Five-story daily digest with links and freshness | Scheduled collection, normalization, ranking, digest delivery |
| Personal Trainer | Health / routine | 4 | 5 | 5 | 4 | 4 | Curated RAG, profile, tracker, safety rules, progression state | General education and draft workout suggestions with screening questions | RAG, personal state, safety policy, progress tracking |
| Nutritionist | Health / routine | 4 | 4 | 5 | 4 | 4 | Nutrition sources, preferences, allergies, medical boundaries, grocery data | Educational meal-planning support with explicit caveats | Profile state, retrieval, planning, grocery generation |
| Master Chef | Health / routine | 4 | 3 | 2 | 4 | 3 | Recipe database, URL extraction, transcription/OCR, unit normalization | Import and normalize recipes from URLs; grocery list later | Extraction, normalization, provenance, structured data |
| Philosopher | Persona / transformation | 2 | 1 | 1 | 2 | 3 | Style rules and boundaries | Text response in a chosen philosophical voice, without claiming authority | Persona layer, style evaluation |
| General Manager | Knowledge / operations | 4 | 3 | 4 | 5 | 3 | Process documentation, state store, workflow ownership, permissions | Answer process questions from a curated operating manual | Retrieval, state, routing, escalation, audit |
| Deal Finder | Knowledge / monitoring | 3 | 3 | 2 | 3 | 3 | Search/browser, price history, alerting, affiliate or retailer constraints | Find and compare deals for a specified product/category | Browser research, normalization, ranking, alerts |
| Zillennial Translator | Persona / transformation | 2 | 1 | 1 | 2 | 2 | Style examples and audience controls | Transform supplied text with explicit tone and intensity controls | Persona layer, transformation evaluation |
| British Zoologist | Persona / domain | 2 | 2 | 1 | 2 | 3 | Zoology reference sources, voice/style handling | Grounded zoology explanation with optional British style | Research, source verification, persona layer |
| Video Editor | Media / content | 4 | 5 | 3 | 4 | 4 | Local footage index, proxies, transcription, thumbnails, storage, review UI | Searchable footage catalog and candidate highlight list | File indexing, media analysis, embeddings/search, review queue |

## What the matrix suggests

### High-value, low-to-moderate effort candidates

These are strong experiments because they can produce visible value without requiring the hardest infrastructure:

- Code Reviewer
- Project Planner
- Deep Researcher
- News Rundown
- Script Writer / Editor

They also exercise reusable primitives: structured outputs, bounded execution, source verification, planning, scheduled delivery, and iterative refinement.

### High-value infrastructure multipliers

These may not be the first visible agents, but their capabilities unlock many others:

- Personal Assistant
- Development Leader
- System Administrator
- Deep Researcher
- General Manager

They should be designed carefully because they can become broad routers or permission hubs. Their first versions should remain narrow and observable.

### High-complexity systems to approach as staged products

- Media Manager
- Video Editor
- Personal Trainer
- Nutritionist
- System Administrator
- Self-Hosting / Home Lab Expert
- Financier

For these, define a read-only or draft-only slice first. Do not treat the full concept as the MVP.

### Persona agents

Philosopher, Zillennial Translator, and British Zoologist are inexpensive to prototype and useful for learning persona evaluation. They should remain capability-light and should not receive privileged credentials. Cortana is different: it is a persona plus a router, so it should wait until the underlying utility capabilities and approval model are reliable.

## Decision questions before selecting a first wave

1. Which recurring task do you personally perform often enough to validate weekly?
2. Which data source is already available and trustworthy?
3. Which output can you judge in under five minutes?
4. Which agent would create infrastructure that at least two other agents can reuse?
5. Which candidate has a useful read-only MVP that does not require a new database, NAS, or model pipeline?
6. Which agent would be dangerous to build before credential and approval boundaries are settled?
7. Which candidate would still be useful if the workflow failed halfway through?

## Suggested selection heuristic

Rather than sorting by a single score, choose a small portfolio that contains:

- One high-frequency personal utility.
- One reusable knowledge or research capability.
- One software/operations capability with strong verification.
- One intentionally low-risk persona experiment.
- No agent whose first version requires autonomous destructive, financial, or health-critical action.
