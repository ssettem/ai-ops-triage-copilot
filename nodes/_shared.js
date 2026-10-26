// ── Shared operating policy ─────────────────────────────────────────────────
// build_workflow.mjs prepends this block to every Code node, so the SLA targets,
// routing table and thresholds live in exactly one place.

// SLA targets by priority, in hours (the same P1/P2/P3 rules the AI is given).
const SLA_HOURS = { P1: 1, P2: 8, P3: 72 };
const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3 };

const CATEGORIES = ["Plumbing", "Electrical", "Lift", "Housekeeping", "Security", "Amenities", "Pest Control", "Billing", "Other"];

// Category -> owning team. Routing is a business rule, so it stays in code, not in the model.
const TEAM = {
  Plumbing: "Maintenance", Electrical: "Maintenance", Lift: "Maintenance",
  Housekeeping: "Housekeeping", "Pest Control": "Housekeeping",
  Security: "Security", Amenities: "Facility Manager", Billing: "Accounts", Other: "Ops Desk",
};

// Below this self-reported confidence, a person checks the ticket before dispatch.
const CONFIDENCE_FLOOR = 0.7;
// A ticket is "at risk" once less than this share of its SLA window is left.
const AT_RISK_SHARE = 0.25;

// claude-opus-5-5 list price, US$ per million tokens (input, output).
const PRICE_PER_MTOK = { input: 4, output: 20 };
