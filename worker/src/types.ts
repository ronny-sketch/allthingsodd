// Canonical shapes shared by both adapters. Keep enum-like string fields
// (`product`, `source`) as plain `string` here rather than importing the
// YAML in ../../schemas — the Worker has no build step that reads YAML, so
// the enums are enforced by validate.ts instead. If they drift, that's a
// bug: update both.
//
// Same-origin by design: this Worker serves the static Astro build (via the
// ASSETS binding) *and* handles `/api/*`, so there is no cross-origin
// request here and therefore no CORS handling needed. See worker/src/index.ts.

export interface Env {
  ASSETS: Fetcher;
  ATTIO_API_KEY: string;
  BEEHIIV_API_KEY: string;
  BEEHIIV_PUBLICATION_ID: string;
}

export interface UtmFields {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface EnquirySubmission extends UtmFields {
  name: string;
  work_email: string;
  organisation: string;
  interest: string; // schemas/products.yml
  goal: string;
  timing?: string;
  landing_page?: string;
  referrer?: string;
  submitted_at: string;
}

export interface SubscribeSubmission extends UtmFields {
  email: string;
  source?: string; // schemas/source.yml — defaults to "website_form"
  landing_page?: string;
}

export interface CrmAdapter {
  upsertPerson(input: {
    name: string;
    email: string;
    companyId?: string;
    source: string;
  }): Promise<{ id: string }>;
  upsertCompany(input: { name: string; domain?: string }): Promise<{ id: string }>;
  createOrUpdateDeal(input: {
    name: string;
    personId: string;
    companyId: string;
    product: string;
    stage: string;
    source: string;
    utm: UtmFields;
    notes: string;
  }): Promise<{ id: string }>;
}

export interface NewsletterAdapter {
  subscribe(input: {
    email: string;
    source?: string;
    utm: UtmFields;
  }): Promise<{ status: 'subscribed' | 'already_subscribed' }>;
}
