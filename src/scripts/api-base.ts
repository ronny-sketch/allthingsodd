// Single source of truth for where the two Growth OS forms
// (work-enquiry-form.ts, newsletter-form.ts) send their POSTs.
//
// Production hosting here is Surge (plain static, no Cloudflare zone in
// front of it — see docs/deployment.md), so there's no Cloudflare Route to
// make this same-origin yet. Until the documented DNS cutover happens
// (../odd-growth-os/ops/DECISIONS.md D1/D13), both forms call the Worker's
// own workers.dev URL directly; the Worker CORS-allowlists this exact
// origin (../odd-growth-os/worker/src/index.ts). After cutover, set this
// back to '' (relative, same-origin) in the same commit that adds the
// Cloudflare Route.
export const API_BASE = 'https://odd-field-guide.ronny-507.workers.dev';
