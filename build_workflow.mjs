// Builds workflow.json (the file you import into n8n) from nodes/*.js and data/tickets.json.
// Each Code node gets nodes/_shared.js prepended, so the policy lives in one place.
// Run: node build_workflow.mjs
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const shared = read("./nodes/_shared.js");
const code = (name) => `${shared}\n${read(`./nodes/${name}.js`)}`
  .replace("__TICKETS__", JSON.stringify(JSON.parse(read("./data/tickets.json")), null, 2));

const node = (name, type, typeVersion, x, parameters, extra = {}) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name, type, typeVersion, position: [x, 0], parameters, ...extra,
});

const nodes = [
  node("Start", "n8n-nodes-base.manualTrigger", 1, 0, {}),
  node("Load tickets", "n8n-nodes-base.code", 2, 220, { jsCode: code("load_tickets") }),
  node("Build Claude request", "n8n-nodes-base.code", 2, 440, { jsCode: code("build_request") }),
  node("Classify with Claude", "n8n-nodes-base.httpRequest", 4.2, 660, {
    method: "POST",
    url: "https://api.anthropic.com/v1/messages",
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "anthropic-version", value: "2026-10-21" },
        { name: "anthropic-beta", value: "server-side-fallback-2026-07-01" },
      ],
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json.requestBody) }}",
    // 5 tickets per second keeps well under API rate limits.
    options: { batching: { batch: { batchSize: 5, batchInterval: 1000 } } },
  }),
  node("Apply guardrails & SLA", "n8n-nodes-base.code", 2, 880, { jsCode: code("apply_guardrails") }),
  node("Score against labels", "n8n-nodes-base.code", 2, 1100, { jsCode: code("evaluate") }),
  node("Build ops report", "n8n-nodes-base.code", 2, 1320, { jsCode: code("build_report") }),
  node("Email ops report", "n8n-nodes-base.emailSend", 2.1, 1540, {
    fromEmail: "you@example.com",
    toEmail: "you@example.com",
    subject: "={{ $json.subject }}",
    emailFormat: "html",
    html: "={{ $json.html }}",
    options: {},
  }),
];

const names = nodes.map((n) => n.name);
const connections = Object.fromEntries(
  names.slice(0, -1).map((name, i) => [name, { main: [[{ node: names[i + 1], type: "main", index: 0 }]] }]),
);

const workflow = { name: "AI Ops Triage Copilot", nodes, connections, settings: { executionOrder: "v1" } };
writeFileSync(new URL("./workflow.json", import.meta.url), JSON.stringify(workflow, null, 2));
console.log(`wrote workflow.json (${nodes.length} nodes)`);
