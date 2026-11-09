# Financier Agent

Financier is a staged, personal-use finance analysis agent. It adds a finance track to the repository without changing the existing first-wave agents.

## Initial scope

- Read live public market/news data through a configured n8n provider and preserve source URLs and quote timestamps.
- Analyze user-provided positions and financial constraints; do not connect to personal/live accounts.
- Produce conditional market and options scenarios, trend/pattern observations, private alerts, explicit assumptions, and downside analysis.
- Journal paper trades and evaluate strategies against historical and held-out data.
- Support Webull paper trading only through a separately verified paper integration.
- Consider direct model fine-tuning only after paper-trade records are clean, permissioned, and sufficient for meaningful held-out evaluation.

The agent is not a licensed financial adviser, does not guarantee returns, and does not provide tax or legal conclusions. Signals and chart patterns are hypotheses, not evidence of a guaranteed predictive edge. User-provided financial information is not independently verified.

## Market-analysis path

```text
Schedule or manual trigger
  -> Fetch public quotes/news through configured provider
  -> Normalize symbols, option contracts, source URLs, and observed timestamps
  -> Validate required fields and configured freshness limits
  -> Invoke Financier with normalized evidence and user-provided constraints
  -> Validate the structured result
  -> Return analysis and optionally deliver a private alert
  -> Record run metadata and source references
```

The agent must not invent missing quotes or treat an old quote as current. A specific option analysis requires the contract expiration, strike, multiplier, bid/ask and quote timestamp; Greeks and implied volatility should be included when available. Delta is not a probability of profit. If data are stale or incomplete, return a partial or blocked result instead of fabricating a conclusion.

Trendlines, chart patterns, and technical indicators may be described as conditional observations with a trigger and an invalidation point. The agent must not label a pattern as a proven signal without tested evidence that includes costs, slippage, and out-of-sample results.

## Paper-trading permissions

The default execution mode is `manual`: the agent can prepare a paper-order candidate but cannot submit it. Optional modes are:

- `confirm_each`: submit only after the workflow verifies a current user confirmation bound to the exact order payload.
- `bounded_autonomous`: submit only after separate owner activation of a paper-only policy with explicit symbols, position/notional limits, maximum daily loss, order-count and contract limits, an expiry, and a working kill switch.

The model never selects its own execution mode or calls the broker. n8n owns credentials, policy state, account-mode verification, risk checks, the final approval gate, idempotency, and reconciliation. The initial order scope is limit orders for long stock or single-leg long options and closing those long positions; short stock, short options, spreads, and multi-leg orders are not supported. An uncertain submit is reconciled by querying the paper account; it is never blindly retried.

The `finance-webull-paper-order` workflow is a contract, not a deployed n8n workflow. The user reports having a supported Webull paper API/integration, but this repository does not establish its exact endpoint, authentication scope, paper-account identity check, or supported order operations. Verify these details before configuring credentials or enabling submissions. Keep credentials in n8n's credential store; never put them in prompts, agent files, generated adapters, or chat. No live-account route is permitted.

## Paper-trade learning

The first learning loop is structured, idempotent journaling plus offline strategy evaluation. Record the strategy/version, thesis, source run, quote time, actual paper fills, exit, fees, and realized result without collecting credentials or unnecessary personal data. A deterministic evaluation worker should calculate metrics; the language model may explain results but must not be the source of arithmetic. Evaluate on separate training, validation, and held-out periods, compare to simple baselines, check for leakage and survivorship bias, and include transaction costs and slippage assumptions.

Direct language-model fine-tuning is a later research path, not an online update loop. It requires owner-approved data use, a versioned dataset/model, privacy review, a held-out evaluation, documented failure cases, and explicit approval before a model can inform production signals. A paper-trading result is not proof of future profitability.

## Contracts and evaluation

- Agent: `agents/finance/agent.yaml` and `agents/finance/system.md`
- n8n contracts: market monitoring, paper-trade journaling/evaluation, and Webull paper-order submission under `workflows/n8n/`
- Schemas: finance analysis, paper-trade record, and paper-order request/result contracts under `workflows/n8n/schemas/`
- Regression scenarios: `evaluations/finance.yaml`

These artifacts define interfaces and guardrails. They do not connect an external data provider, deploy an n8n workflow, configure a Webull credential, or submit an order.
