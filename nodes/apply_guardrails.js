// Turns Claude's answer into an operational decision: which team owns it, where it
// goes (P1 alert, human review, or straight to dispatch), and how much SLA time is left.
// The HTTP node returns answers in ticket order, so answer i belongs to ticket i.
const tickets = $("Build Claude request").all();
const earlier = {}; // property|category -> word sets of tickets already seen

// Meaningful words of a ticket, for spotting two tickets about the same problem.
const STOP = new Set(["this", "that", "with", "from", "there", "have", "been", "since", "after", "about", "your", "they", "their", "near", "keeps", "again", "still", "nobody"]);
const words = (s) => new Set((s.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 3 && !STOP.has(w)));
const overlap = (a, b) => [...a].filter((w) => b.has(w)).length / Math.min(a.size, b.size || 1);

return $input.all().map((item, i) => {
  const t = tickets[i].json;
  const res = item.json;
  let answer = null;
  let problem = "";

  if (res.stop_reason === "refusal") problem = "AI declined this ticket";
  else if (res.stop_reason === "max_tokens") problem = "AI answer was cut off";
  else {
    const text = (res.content || []).find((b) => b.type === "text")?.text;
    try { answer = JSON.parse(text); } catch { problem = "AI answer could not be read"; }
  }

  const category = answer?.category ?? "Other";
  const priority = answer?.priority ?? "P2"; // unknown risk: assume same-day until a person checks
  const confidence = Math.max(0, Math.min(1, Number(answer?.confidence ?? 0)));

  // A repeat complaint = same property, same category, and mostly the same problem in words.
  // ponytail: word overlap, not semantic matching; swap in embeddings if repeats slip through.
  const repeatKey = `${t.property}|${category}`;
  const mine = words(t.text);
  const isRepeat = (earlier[repeatKey] || []).some((prev) => overlap(mine, prev) >= 0.4);
  (earlier[repeatKey] ||= []).push(mine);

  const reviewReasons = [];
  if (problem) reviewReasons.push(problem);
  if (confidence < CONFIDENCE_FLOOR) reviewReasons.push(`confidence ${confidence.toFixed(2)} below ${CONFIDENCE_FLOOR}`);
  if (isRepeat) reviewReasons.push("repeat complaint");

  const route = priority === "P1" ? "P1 alert" : reviewReasons.length ? "Human review" : "Auto-dispatch";

  const slaHours = SLA_HOURS[priority];
  const hoursLeft = +(slaHours - t.age_hours).toFixed(1);
  const slaStatus = hoursLeft < 0 ? "Breached" : hoursLeft <= slaHours * AT_RISK_SHARE ? "At risk" : "On track";

  const usage = res.usage || {};
  return {
    json: {
      id: t.id, property: t.property, text: t.text, age_hours: t.age_hours,
      category, priority, confidence, team: TEAM[category],
      dispatch_note: answer?.dispatch_note ?? "",
      route, review_reasons: reviewReasons, is_repeat: isRepeat,
      sla_hours: slaHours, sla_hours_left: hoursLeft, sla_status: slaStatus,
      input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0,
      expected_category: t.expected_category, expected_priority: t.expected_priority,
    },
  };
});
