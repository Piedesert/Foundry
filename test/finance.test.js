import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ROOT } from "../src/core.js";

async function loadSchema(fileName) {
  const filePath = path.join(ROOT, "workflows", "n8n", "schemas", fileName);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

test("finance analysis contracts require timestamped evidence and reject credential fields", async () => {
  const requestSchema = await loadSchema("finance-analysis-request.schema.json");
  const resultSchema = await loadSchema("finance-analysis-result.schema.json");
  const ajv = createAjv();
  const validateRequest = ajv.compile(requestSchema);
  const validateResult = ajv.compile(resultSchema);
  const request = {
    analysis_type: "trade_analysis",
    request_time: "2026-11-09T20:00:00Z",
    symbols: ["NVDA"],
    user_question: "Compare a long call with a downside hedge.",
    freshness_policy: { max_quote_age_seconds: 300, max_news_age_seconds: 86400 },
    market_snapshot: [{
      symbol: "NVDA",
      instrument_type: "option",
      observed_at: "2026-11-09T19:59:00Z",
      source_url: "https://example.com/options",
      last_price: 10,
      bid: 9.5,
      ask: 10.5,
      currency: "USD",
      option_type: "put",
      expiration: "2026-12-18",
      strike: 150,
      delta: -0.7,
      multiplier: 100
    }],
    risk_limits: { max_loss_per_trade_usd: 1000 }
  };
  assert.equal(validateRequest(request), true);
  assert.equal(validateRequest({ ...request, api_key: "must-not-be-accepted" }), false);
  assert.equal(validateRequest({
    ...request,
    market_snapshot: [{ ...request.market_snapshot[0], multiplier: undefined }]
  }), false);
  assert.equal(validateResult({
    status: "blocked",
    as_of: "2026-11-09T20:00:00Z",
    summary: "Current option-chain data is missing.",
    facts: [],
    signals: [],
    trade_scenarios: [],
    risk_assessment: {
      within_user_limits: null,
      assumptions: [],
      worst_case: "Cannot calculate without current quotes.",
      maximum_loss_usd: null,
      user_limit_usd: null
    },
    sources: [],
    limitations: ["No current option chain was supplied."],
    warnings: ["No specific trade can be evaluated."]
  }), true);
});

test("paper-order contracts enforce paper-only routing and distinct execution approvals", async () => {
  const orderSchema = await loadSchema("finance-paper-order-request.schema.json");
  const ajv = createAjv();
  const validateOrder = ajv.compile(orderSchema);
  const baseOrder = {
    request_id: "request-1",
    action: "prepare",
    execution_mode: "manual",
    environment: "paper",
    symbol: "NVDA",
    instrument_type: "stock",
    position_action: "open_long",
    quantity: 1,
    order_type: "limit",
    limit_price: 100,
    quote_observed_at: "2026-11-09T19:59:00Z",
    quote_source_url: "https://example.com/quote",
    risk_policy: {
      policy_id: "paper-policy-1",
      max_loss_per_trade_usd: 1000,
      max_notional_per_order_usd: 1000,
      max_daily_loss_usd: 1000,
      max_orders_per_day: 2,
      max_contracts_per_order: 1
    },
    idempotency_key: "paper-order-1"
  };
  assert.equal(validateOrder(baseOrder), true);
  assert.equal(validateOrder({ ...baseOrder, environment: "live" }), false);
  assert.equal(validateOrder({ ...baseOrder, execution_mode: "manual", action: "submit" }), false);
  assert.equal(validateOrder({
    ...baseOrder,
    execution_mode: "confirm_each",
    action: "submit"
  }), false);
  assert.equal(validateOrder({
    ...baseOrder,
    execution_mode: "confirm_each",
    action: "submit",
    approval: {
      request_id: "request-1",
      payload_digest: "sha256:digest",
      confirmed_at: "2026-11-09T20:00:00Z"
    }
  }), true);
  assert.equal(validateOrder({
    ...baseOrder,
    execution_mode: "bounded_autonomous",
    action: "submit"
  }), false);
  assert.equal(validateOrder({
    ...baseOrder,
    execution_mode: "bounded_autonomous",
    action: "submit",
    standing_policy: {
      policy_id: "policy-1",
      payload_digest: "sha256:policy",
      activated_at: "2026-11-09T19:00:00Z",
      expires_at: "2026-11-10T19:00:00Z",
      max_orders_per_day: 2,
      max_notional_per_order_usd: 1000,
      max_daily_loss_usd: 1000,
      max_contracts_per_order: 1,
      allowed_symbols: ["NVDA"],
      kill_switch_available: true,
      kill_switch_active: false
    }
  }), true);
});

test("paper-trade records cannot represent live-account activity", async () => {
  const recordSchema = await loadSchema("finance-paper-trade-record.schema.json");
  const validateRecord = createAjv().compile(recordSchema);
  const record = {
    record_id: "trade-1",
    idempotency_key: "trade-1",
    provider: "webull",
    environment: "paper",
    status: "open",
    instrument_type: "option",
    symbol: "NVDA",
    position_action: "open_long",
    quantity: 1,
    entry_price: 8.5,
    entry_time: "2026-11-09T20:00:00Z",
    currency: "USD",
    option_contract: {
      option_type: "put",
      expiration: "2026-12-18",
      strike: 150,
      multiplier: 100,
      delta_at_entry: -0.7
    },
    strategy_id: "long-put-hedge-v1",
    thesis: "Defined-risk downside hedge for a paper portfolio.",
    source_run_id: "run-1",
    source_ids: ["quote-1"]
  };
  assert.equal(validateRecord(record), true);
  assert.equal(validateRecord({ ...record, environment: "live" }), false);
  assert.equal(validateRecord({ ...record, option_contract: undefined }), false);
  assert.equal(validateRecord({ ...record, exit_price: 8 }), false);
});

test("paper-order workflow policy requires a manual default and paper-only bounds", async () => {
  const workflowSchema = JSON.parse(await fs.readFile(
    path.join(ROOT, "schemas", "workflow.schema.json"),
    "utf8"
  ));
  const validateWorkflow = createAjv().compile(workflowSchema);
  const workflow = {
    workflow_id: "finance-webull-paper-order",
    version: "0.1.0",
    agent_id: "finance",
    input_schema_ref: "workflows/n8n/schemas/finance-paper-order-request.schema.json",
    output_schema_ref: "workflows/n8n/schemas/finance-paper-order-result.schema.json",
    retry_policy: { max_attempts: 1 },
    failure_mode: "return_structured_error",
    write_policy: {
      mode: "paper_order",
      confirmation_required: true,
      retry_uncertain_write: false,
      paper_only: true,
      default_execution_mode: "manual",
      available_execution_modes: ["manual", "confirm_each", "bounded_autonomous"],
      bounded_mode_requires_explicit_activation: true,
      required_limits: [
        "max_loss_per_trade_usd",
        "max_notional_per_order_usd",
        "max_daily_loss_usd",
        "max_orders_per_day",
        "max_contracts_per_order",
        "allowed_symbols",
        "kill_switch_available"
      ]
    }
  };
  assert.equal(validateWorkflow(workflow), true);
  assert.equal(validateWorkflow({
    ...workflow,
    write_policy: { ...workflow.write_policy, paper_only: false }
  }), false);
  assert.equal(validateWorkflow({
    ...workflow,
    write_policy: { ...workflow.write_policy, retry_uncertain_write: true }
  }), false);
  assert.equal(validateWorkflow({
    ...workflow,
    write_policy: { ...workflow.write_policy, default_execution_mode: "bounded_autonomous" }
  }), false);
});

test("paper-trade evaluation requires held-out data and does not train a model", async () => {
  const requestSchema = await loadSchema("finance-papertrade-evaluation-request.schema.json");
  const resultSchema = await loadSchema("finance-papertrade-evaluation-result.schema.json");
  const ajv = createAjv();
  const validateRequest = ajv.compile(requestSchema);
  const validateResult = ajv.compile(resultSchema);
  const request = {
    run_id: "evaluation-1",
    dataset_id: "paper-trades",
    dataset_version: "v1",
    record_ids: ["trade-1"],
    strategy_id: "long-call",
    strategy_version: "v1",
    baseline_strategy_id: "buy-and-hold",
    period: { start_date: "2025-01-01", end_date: "2026-01-01" },
    split: {
      training_end_date: "2025-06-30",
      validation_end_date: "2025-09-30",
      test_start_date: "2025-10-01",
      test_end_date: "2026-01-01",
      out_of_sample_required: true
    },
    cost_model: {
      commission_per_contract_usd: 0.65,
      slippage_basis_points: 10,
      include_spread_costs: true
    },
    mode: "offline_strategy_evaluation",
    allow_model_training: false
  };
  assert.equal(validateRequest(request), true);
  assert.equal(validateRequest({ ...request, allow_model_training: true }), false);
  assert.equal(validateRequest({
    ...request,
    split: { ...request.split, out_of_sample_required: false }
  }), false);
  const result = {
    status: "success",
    run_id: "evaluation-1",
    dataset_id: "paper-trades",
    sample_size: 20,
    strategy_metrics: {
      net_return_pct: 3,
      maximum_drawdown_pct: 4,
      win_rate_pct: 55,
      expectancy_usd: 12,
      trade_count: 20
    },
    baseline_metrics: {
      net_return_pct: 2,
      maximum_drawdown_pct: 3,
      win_rate_pct: 50,
      expectancy_usd: 8,
      trade_count: 20
    },
    validation: {
      out_of_sample_completed: true,
      leakage_check: "passed",
      model_training_performed: false,
      reproducibility_reference: "run-1"
    },
    limitations: [],
    warnings: []
  };
  assert.equal(validateResult(result), true);
  assert.equal(validateResult({
    ...result,
    validation: { ...result.validation, out_of_sample_completed: false }
  }), false);
});
