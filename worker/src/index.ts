// Single Worker serving the static Astro build (via the ASSETS binding —
// see wrangler.toml) plus two deterministic integration routes. This is the
// whole runtime layer described in ops/GROWTH_OS_GUIDE.md's locked
// architecture: no LLM/MCP in this request path, ever — a form submission
// is validated and routed by plain code, same as any production backend.
//
// Same-origin: the site and these routes are served from the same Worker,
// so there's no CORS to configure and no API base URL to hardcode in the
// frontend — forms just POST to a relative `/api/...` path.

import type { Env } from './types';
import { validateEnquiry, validateSubscribe, ValidationError } from './validate';
import { createAttioAdapter, domainFromEmail, utmSummary } from './adapters/attio';
import { createBeehiivAdapter } from './adapters/beehiiv';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Genuinely user-facing message only — never the raw error. See guide §64.
const GENERIC_FAILURE = {
  ok: false,
  message: "We couldn't submit this right now. Please try again or email us directly.",
};

async function handleBusinessEnquiry(request: Request, env: Env): Promise<Response> {
  let submission;
  try {
    const raw = await request.json();
    submission = validateEnquiry(raw as never);
  } catch (err) {
    const message = err instanceof ValidationError ? err.message : 'Invalid submission';
    return json({ ok: false, message }, 400);
  }

  try {
    const attio = createAttioAdapter(env.ATTIO_API_KEY);
    const domain = domainFromEmail(submission.work_email);

    const company = await attio.upsertCompany({ name: submission.organisation, domain });
    const person = await attio.upsertPerson({
      name: submission.name,
      email: submission.work_email,
      companyId: company.id,
      source: 'website_form',
    });
    await attio.createOrUpdateDeal({
      name: `${submission.organisation} — ${submission.interest}`,
      personId: person.id,
      companyId: company.id,
      product: submission.interest,
      stage: 'target',
      source: 'website_form',
      utm: submission,
      notes: [
        `Goal: ${submission.goal}`,
        submission.timing ? `Timing: ${submission.timing}` : undefined,
        `Landing page: ${submission.landing_page ?? 'unknown'}`,
        `Referrer: ${submission.referrer ?? 'direct'}`,
        `UTM: ${utmSummary(submission)}`,
        `Submitted: ${submission.submitted_at}`,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    // Guide §35 — transactional acknowledgement only, no fabricated
    // personal-read claim. Actually sending this email is a separate,
    // deterministic step (not built here yet — see ops/SETUP_STATUS.md);
    // for v1 the success response itself is what the form shows.
    return json({
      ok: true,
      message: "Thanks — we've received this and will get back to you soon.",
    });
  } catch (err) {
    console.error('business-enquiry failed', err);
    return json(GENERIC_FAILURE, 502);
  }
}

async function handleNewsletter(request: Request, env: Env): Promise<Response> {
  let submission;
  try {
    const raw = await request.json();
    submission = validateSubscribe(raw as never);
  } catch (err) {
    const message = err instanceof ValidationError ? err.message : 'Invalid submission';
    return json({ ok: false, message }, 400);
  }

  try {
    const beehiiv = createBeehiivAdapter(env.BEEHIIV_API_KEY, env.BEEHIIV_PUBLICATION_ID);
    await beehiiv.subscribe({
      email: submission.email,
      source: submission.source,
      utm: submission,
    });
    return json({ ok: true, message: "You're subscribed — welcome." });
  } catch (err) {
    console.error('newsletter subscribe failed', err);
    return json(GENERIC_FAILURE, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/business-enquiry') {
      return handleBusinessEnquiry(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/newsletter') {
      return handleNewsletter(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, message: 'Not found' }, 404);
    }

    // Everything else is the static Astro build.
    return env.ASSETS.fetch(request);
  },
};
