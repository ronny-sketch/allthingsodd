// Server-side validation. Never trust the frontend's `required`/type=email —
// this is the actual gate. Kept enum values in sync by hand with
// ../../schemas/*.yml (see types.ts comment) — small, stable lists, not worth
// a YAML-parsing dependency in a Worker.

const PRODUCTS = new Set([
  'oddference_corporate',
  'oddmembership',
  'oddagency',
  'strategic_partnership',
  'other',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 2000;
const MAX_SHORT = 200;

export class ValidationError extends Error {}

function str(value: unknown, field: string, maxLen: number, required = true): string {
  if (typeof value !== 'string' || (required && value.trim() === '')) {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = (value as string).trim().slice(0, maxLen);
  // Strip anything that looks like markup — this is a plain-text form,
  // no field here is ever rendered as HTML, but defense in depth costs
  // nothing.
  return trimmed.replace(/<[^>]*>/g, '');
}

export interface RawEnquiry {
  name: unknown;
  work_email: unknown;
  organisation: unknown;
  interest: unknown;
  goal: unknown;
  timing?: unknown;
  landing_page?: unknown;
  referrer?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  botcheck?: unknown; // honeypot — must arrive empty
}

export function validateEnquiry(body: RawEnquiry) {
  if (typeof body.botcheck === 'string' && body.botcheck.trim() !== '') {
    throw new ValidationError('spam detected');
  }
  const name = str(body.name, 'name', MAX_SHORT);
  const work_email = str(body.work_email, 'work_email', MAX_SHORT).toLowerCase();
  if (!EMAIL_RE.test(work_email)) throw new ValidationError('work_email is invalid');
  const organisation = str(body.organisation, 'organisation', MAX_SHORT);
  const interest = str(body.interest, 'interest', MAX_SHORT);
  if (!PRODUCTS.has(interest)) throw new ValidationError('interest is not a recognised product');
  const goal = str(body.goal, 'goal', MAX_TEXT);
  const timing = body.timing ? str(body.timing, 'timing', MAX_SHORT, false) : undefined;

  return {
    name,
    work_email,
    organisation,
    interest,
    goal,
    timing,
    landing_page: body.landing_page
      ? str(body.landing_page, 'landing_page', MAX_SHORT, false)
      : undefined,
    referrer: body.referrer ? str(body.referrer, 'referrer', MAX_SHORT, false) : undefined,
    utm_source: body.utm_source ? str(body.utm_source, 'utm_source', MAX_SHORT, false) : undefined,
    utm_medium: body.utm_medium ? str(body.utm_medium, 'utm_medium', MAX_SHORT, false) : undefined,
    utm_campaign: body.utm_campaign
      ? str(body.utm_campaign, 'utm_campaign', MAX_SHORT, false)
      : undefined,
    utm_content: body.utm_content
      ? str(body.utm_content, 'utm_content', MAX_SHORT, false)
      : undefined,
    utm_term: body.utm_term ? str(body.utm_term, 'utm_term', MAX_SHORT, false) : undefined,
    submitted_at: new Date().toISOString(),
  };
}

export interface RawSubscribe {
  email: unknown;
  source?: unknown;
  landing_page?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  botcheck?: unknown;
}

export function validateSubscribe(body: RawSubscribe) {
  if (typeof body.botcheck === 'string' && body.botcheck.trim() !== '') {
    throw new ValidationError('spam detected');
  }
  const email = str(body.email, 'email', MAX_SHORT).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError('email is invalid');

  return {
    email,
    source: body.source ? str(body.source, 'source', MAX_SHORT, false) : 'website_form',
    landing_page: body.landing_page
      ? str(body.landing_page, 'landing_page', MAX_SHORT, false)
      : undefined,
    utm_source: body.utm_source ? str(body.utm_source, 'utm_source', MAX_SHORT, false) : undefined,
    utm_medium: body.utm_medium ? str(body.utm_medium, 'utm_medium', MAX_SHORT, false) : undefined,
    utm_campaign: body.utm_campaign
      ? str(body.utm_campaign, 'utm_campaign', MAX_SHORT, false)
      : undefined,
    utm_content: body.utm_content
      ? str(body.utm_content, 'utm_content', MAX_SHORT, false)
      : undefined,
    utm_term: body.utm_term ? str(body.utm_term, 'utm_term', MAX_SHORT, false) : undefined,
  };
}
