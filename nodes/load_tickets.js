// 40 sample service tickets for residential and commercial properties (made up; no
// real client data). Each has a hand label (expected_category / expected_priority)
// so the run can be scored, and age_hours (how long it has been open) for SLA tracking.
// The list is injected from data/tickets.json at build time.
const TICKETS = __TICKETS__;

return TICKETS.map((t) => ({ json: t }));
