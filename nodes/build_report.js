// One email for the ops lead: what needs action now (P1s, SLA breaches, the review
// queue), then the workload by team, then whether the AI can be trusted and what it cost.
const { metrics: m, rows } = $input.first().json;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const table = (head, body) => body.length
  ? `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:13px">
<tr>${head.map((h) => `<th align="left">${h}</th>`).join("")}</tr>
${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n")}
</table>`
  : "<p>None.</p>";

const byTeam = Object.entries(rows.reduce((a, r) => ({ ...a, [r.team]: (a[r.team] || 0) + 1 }), {}))
  .sort((a, b) => b[1] - a[1]);
const p1 = rows.filter((r) => r.route === "P1 alert");
const review = rows.filter((r) => r.route === "Human review");
const sla = rows.filter((r) => r.sla_status !== "On track")
  .sort((a, b) => a.sla_hours_left - b.sla_hours_left);
const misses = rows.filter((r) => !r.both_ok);

const html = `<div style="font-family:Arial;max-width:900px">
<h2>Ops triage report: ${m.tickets} tickets</h2>
<p><b>${p1.length}</b> P1 alerts &middot; <b>${m.sla_breached}</b> SLA breaches &middot; <b>${m.sla_at_risk}</b> at risk &middot;
<b>${review.length}</b> waiting for human review &middot; <b>${m.auto_dispatch_rate}%</b> auto-dispatched</p>

<h3>Act now: P1 alerts</h3>
${table(["Ticket", "Property", "Team", "Dispatch note", "SLA left (h)"], p1.map((r) => [r.id, r.property, r.team, r.dispatch_note, r.sla_hours_left]))}

<h3>SLA breaches and at-risk tickets</h3>
${table(["Ticket", "Priority", "Status", "Open (h)", "SLA (h)", "Team"], sla.map((r) => [r.id, r.priority, r.sla_status, r.age_hours, r.sla_hours, r.team]))}

<h3>Human review queue</h3>
${table(["Ticket", "AI said", "Why it was held", "Ticket text"], review.map((r) => [r.id, `${r.category} / ${r.priority}`, r.review_reasons.join("; "), r.text]))}

<h3>Workload by team</h3>
${table(["Team", "Tickets"], byTeam)}

<h3>Can we trust it? Scorecard against hand labels</h3>
${table(["Metric", "Result"], [
  ["Category accuracy", `${m.category_accuracy}%`],
  ["Priority accuracy", `${m.priority_accuracy}%`],
  ["Both correct", `${m.both_accuracy}%`],
  ["P1 recall (emergencies caught)", `${m.p1_recall}%`],
  ["P1 precision", `${m.p1_precision}%`],
  ["Under-prioritized (risky misses)", m.under_prioritized],
  ["Over-prioritized (cautious misses)", m.over_prioritized],
  ["Accuracy when auto-dispatched", `${m.auto_dispatch_accuracy}%`],
  ["Accuracy when held for review", `${m.flagged_accuracy}%`],
  ["Prompt-injection attempts resisted", `${m.injection_resisted} of ${m.injection_attempts}`],
])}
<h3>Mismatches to learn from</h3>
${table(["Ticket", "Ticket text", "AI said", "Expected"], misses.map((r) => [r.id, r.text, `${r.category} / ${r.priority}`, `${r.expected_category} / ${r.expected_priority}`]))}

<h3>Cost</h3>
<p>${m.input_tokens.toLocaleString()} input + ${m.output_tokens.toLocaleString()} output tokens = <b>$${m.cost_usd}</b> for this run, about <b>$${m.cost_per_100_usd} per 100 tickets</b> (claude-opus-5-5 list price).</p>
</div>`;

return [{
  json: {
    subject: `Ops triage: ${p1.length} P1 alerts, ${m.sla_breached} SLA breaches | ${m.both_accuracy}% match, P1 recall ${m.p1_recall}%`,
    html,
    metrics: m,
  },
}];
