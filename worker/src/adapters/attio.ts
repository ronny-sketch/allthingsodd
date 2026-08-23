// Attio v2 REST API adapter — the CRM data-plane integration. This is
// deterministic server code (per ops/GROWTH_OS_GUIDE.md's MCP-vs-API
// doctrine), not the Attio MCP connector: a website form submission must
// never depend on an LLM interpreting it.
//
// ⚠ UNVERIFIED AGAINST A REAL WORKSPACE. No Attio account exists yet
// (ops/SETUP_STATUS.md). Endpoint shapes below follow Attio's documented v2
// API as of this writing (bearer auth, /v2/objects/{slug}/records for
// create/query, PUT + ?matching_attribute= for upsert, /v2/tasks for
// follow-ups). Before the first real submission:
//   1. create the Attio workspace, People/Companies objects (built in) and a
//      Deals object (see guide §12) with the attributes referenced in
//      ATTRS below;
//   2. confirm each attribute's actual api_slug in Attio (Settings → that
//      object → attribute) — custom attributes get workspace-assigned
//      slugs that will NOT automatically match the guesses below;
//   3. run the controlled TEST-prefixed smoke test in guide §41 and update
//      this comment with the verification date.
// Do not treat this file as "connected" until that smoke test has run.

import type { CrmAdapter, UtmFields } from '../types';

const BASE = 'https://api.attio.com/v2';

// Central place to fix attribute slugs once the real workspace exists.
const ATTRS = {
  deal: {
    stage: 'stage', // VERIFY: Attio's built-in deal "stage" select attribute slug
    value: 'value',
    owner: 'owner',
    source: 'source', // custom attribute — create as a "select" per schemas/source.yml
    product: 'product', // custom attribute — create as a "select" per schemas/products.yml
    utm_source: 'utm_source',
    utm_medium: 'utm_medium',
    utm_campaign: 'utm_campaign',
    next_action: 'next_action',
    next_action_date: 'next_action_date',
  },
};

interface AttioFetchInit extends RequestInit {
  body?: string;
}

async function attioFetch(apiKey: string, path: string, init: AttioFetchInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) {
    // Never forward raw Attio error bodies to the browser (guide §29 error
    // handling) — the caller logs this safely server-side and returns a
    // generic message to the visitor.
    const text = await res.text().catch(() => '');
    throw new Error(`Attio ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<{ data: { id: { record_id: string } } }>;
}

function domainFromEmail(email: string): string | undefined {
  const at = email.split('@')[1];
  // Skip free/personal mail providers — these don't identify a company.
  const freeProviders = new Set(['gmail.com', 'outlook.com', 'hotmail.com', 'icloud.com']);
  return at && !freeProviders.has(at.toLowerCase()) ? at.toLowerCase() : undefined;
}

export function createAttioAdapter(apiKey: string): CrmAdapter {
  return {
    async upsertPerson({ name, email, companyId, source }) {
      const result = await attioFetch(
        apiKey,
        '/objects/people/records?matching_attribute=email_addresses',
        {
          method: 'PUT',
          body: JSON.stringify({
            data: {
              values: {
                name: [{ first_name: name.split(' ')[0], full_name: name }],
                email_addresses: [{ email_address: email }],
                ...(companyId && {
                  company: [{ target_record_id: companyId, target_object: 'companies' }],
                }),
                source: [{ option: source }],
              },
            },
          }),
        },
      );
      return { id: result.data.id.record_id };
    },

    async upsertCompany({ name, domain }) {
      const result = await attioFetch(
        apiKey,
        '/objects/companies/records?matching_attribute=domains',
        {
          method: 'PUT',
          body: JSON.stringify({
            data: {
              values: {
                name: [{ value: name }],
                ...(domain && { domains: [{ domain }] }),
              },
            },
          }),
        },
      );
      return { id: result.data.id.record_id };
    },

    async createOrUpdateDeal({ name, personId, companyId, product, stage, source, utm, notes }) {
      const result = await attioFetch(apiKey, '/objects/deals/records', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            values: {
              name: [{ value: name }],
              associated_people: [{ target_record_id: personId, target_object: 'people' }],
              associated_company: [{ target_record_id: companyId, target_object: 'companies' }],
              [ATTRS.deal.stage]: [{ status: stage }],
              [ATTRS.deal.product]: [{ option: product }],
              [ATTRS.deal.source]: [{ option: source }],
              ...(utm.utm_source && { [ATTRS.deal.utm_source]: [{ value: utm.utm_source }] }),
              ...(utm.utm_medium && { [ATTRS.deal.utm_medium]: [{ value: utm.utm_medium }] }),
              ...(utm.utm_campaign && { [ATTRS.deal.utm_campaign]: [{ value: utm.utm_campaign }] }),
              [ATTRS.deal.next_action]: [{ value: 'Review new inbound enquiry' }],
              [ATTRS.deal.next_action_date]: [{ value: new Date().toISOString().slice(0, 10) }],
            },
          },
        }),
      });

      // Mandatory CRM governance (guide §14): a deal with no next action is
      // never created by this adapter — the fields above always set one.
      // A human still has to actually work it; this only guarantees the
      // hygiene rule at creation time.
      if (notes) {
        await attioFetch(apiKey, '/notes', {
          method: 'POST',
          body: JSON.stringify({
            data: {
              format: 'plaintext',
              parent_object: 'deals',
              parent_record_id: result.data.id.record_id,
              title: 'Website enquiry — original submission',
              content: notes,
            },
          }),
        }).catch(() => {
          // A note failing to attach must not fail the whole submission —
          // the deal itself is the important record.
        });
      }

      return { id: result.data.id.record_id };
    },
  };
}

export function utmSummary(utm: UtmFields): string {
  const parts = Object.entries(utm)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(', ') : 'no UTM data';
}

export { domainFromEmail };
