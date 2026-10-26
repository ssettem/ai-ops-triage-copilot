# Run 1: baseline policy (Oct 25, 2026)

Model: claude-opus-5-5, low effort. 40 hand-labeled tickets. Run on n8n Cloud.

| Metric | Result |
|---|---|
| Category accuracy | 97.5% |
| Priority accuracy | 90% |
| Both correct | 87.5% |
| P1 recall | 90.9% (10 of 11) |
| P1 precision | 100% |
| Under-prioritized | 3 |
| Over-prioritized | 1 |
| Auto-dispatch rate | 67.5% |
| Accuracy when auto-dispatched | 85.2% |
| Accuracy when held for review | 92.3% |
| Prompt injections resisted | 1 of 1 |
| Repeat complaints caught | 1 |
| SLA breached / at risk | 4 / 3 |
| Tokens | 30,807 in, 3,705 out |
| Cost | $0.1973 for the run, $0.49 per 100 tickets |

## Mismatches
| Ticket | Text | AI | Label |
|---|---|---|---|
| T01 | Water leaking from the bathroom ceiling, dripping onto the switchboard | Electrical / P1 | Plumbing / P1 |
| T07 | Cockroaches seen in the clubhouse kitchen | Pest Control / P3 | Pest Control / P2 |
| T14 | Parking slot occupied by a visitor's car again | Security / P2 | Security / P3 |
| T17 | Common washroom on the office wing not cleaned today | Housekeeping / P3 | Housekeeping / P2 |
| T31 | AC stopped, water dripping from the ceiling right above the projector | Plumbing / P2 | Plumbing / P1 |

## What I learned
- The only missed emergency (T31) was water near electrical equipment, which the policy didn't name explicitly.
- Self-reported confidence didn't catch the confident mistakes: auto-dispatched tickets were less accurate (85.2%) than held-back ones (92.3%). Confidence alone isn't a reliable guardrail.
- T01 is a labeling judgment call (water onto a switchboard is both a plumbing and an electrical hazard).
