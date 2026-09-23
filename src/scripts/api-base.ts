// Single source of truth for where the Growth OS forms
// (work-enquiry-form.ts, newsletter-form.ts, contact-form.ts,
// booking-enquiry-form.ts, tickets/api.ts) send their requests.
//
// Production hosting here is Surge (plain static, no Cloudflare zone in
// front of it — see docs/deployment.md), so there's no Cloudflare Route to
// make this same-origin yet. Until the documented DNS cutover happens
// (../odd-growth-os/ops/DECISIONS.md D1/D13), the forms call the Worker's
// own workers.dev URL directly; the Worker CORS-allowlists this exact
// origin (../odd-growth-os/worker/src/index.ts). After cutover, set this
// back to '' (relative, same-origin) in the same commit that adds the
// Cloudflare Route.
//
// PUBLIC_API_BASE (2026-09-23) overrides it at BUILD time, and only the
// pull-request preview job in .github/workflows/ci.yml sets it: preview
// builds talk to the Growth OS staging Worker (odd-growth-os-staging,
// which writes to the TEST copy of the Notion Events Pipeline), so testing
// a preview never creates real records. Production builds never set it.
const PRODUCTION_API_BASE = 'https://odd-field-guide.ronny-507.workers.dev';

export const API_BASE: string = import.meta.env.PUBLIC_API_BASE || PRODUCTION_API_BASE;
