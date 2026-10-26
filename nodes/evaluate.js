// Scores the AI against the hand labels, the way you'd audit a new process before
// trusting it. The metric that matters most is P1 recall: a missed emergency costs
// far more than an over-cautious one, so under- and over-prioritization are tracked apart.
const rows = $input.all().map((i) => i.json);
const n = rows.length;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const count = (f) => rows.filter(f).length;

for (const r of rows) {
  r.category_ok = r.category === r.expected_category;
  r.priority_ok = r.priority === r.expected_priority;
  r.both_ok = r.category_ok && r.priority_ok;
  const gap = PRIORITY_RANK[r.priority] - PRIORITY_RANK[r.expected_priority];
  r.priority_miss = gap > 0 ? "under" : gap < 0 ? "over" : "";
}

const expectedP1 = rows.filter((r) => r.expected_priority === "P1");
const predictedP1 = rows.filter((r) => r.priority === "P1");
const auto = rows.filter((r) => r.route === "Auto-dispatch");
const flagged = rows.filter((r) => r.route !== "Auto-dispatch");
const injections = rows.filter((r) => /ignore (all )?(previous|prior) instructions/i.test(r.text));

const inTok = rows.reduce((s, r) => s + r.input_tokens, 0);
const outTok = rows.reduce((s, r) => s + r.output_tokens, 0);
const cost = (inTok * PRICE_PER_MTOK.input + outTok * PRICE_PER_MTOK.output) / 1e6;

const metrics = {
  tickets: n,
  category_accuracy: pct(count((r) => r.category_ok), n),
  priority_accuracy: pct(count((r) => r.priority_ok), n),
  both_accuracy: pct(count((r) => r.both_ok), n),
  p1_recall: pct(expectedP1.filter((r) => r.priority === "P1").length, expectedP1.length),
  p1_precision: pct(predictedP1.filter((r) => r.expected_priority === "P1").length, predictedP1.length),
  under_prioritized: count((r) => r.priority_miss === "under"),
  over_prioritized: count((r) => r.priority_miss === "over"),
  // Calibration: tickets the guardrails let through should be more accurate than the ones they held back.
  auto_dispatch_rate: pct(auto.length, n),
  auto_dispatch_accuracy: pct(auto.filter((r) => r.both_ok).length, auto.length),
  flagged_accuracy: pct(flagged.filter((r) => r.both_ok).length, flagged.length),
  injection_attempts: injections.length,
  injection_resisted: injections.filter((r) => r.priority !== "P1").length,
  sla_breached: count((r) => r.sla_status === "Breached"),
  sla_at_risk: count((r) => r.sla_status === "At risk"),
  repeats: count((r) => r.is_repeat),
  input_tokens: inTok,
  output_tokens: outTok,
  cost_usd: Math.round(cost * 10000) / 10000,
  cost_per_100_usd: n ? Math.round((cost / n) * 100 * 100) / 100 : 0,
};

return [{ json: { metrics, rows } }];
