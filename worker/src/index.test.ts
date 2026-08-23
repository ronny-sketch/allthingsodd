// Router-level tests with the Attio/beehiiv adapters mocked — this is the
// "External API calls in automated tests should be mocked" requirement from
// ops/GROWTH_OS_GUIDE.md §40. Confirms request routing, the safe-error-
// message behaviour (§64: never leak a raw adapter error to the client),
// and that the static-asset fallback is reached for non-API paths.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Env } from './types';

const upsertPerson = vi.fn();
const upsertCompany = vi.fn();
const createOrUpdateDeal = vi.fn();
const subscribe = vi.fn();

vi.mock('./adapters/attio', () => ({
  createAttioAdapter: () => ({ upsertPerson, upsertCompany, createOrUpdateDeal }),
  domainFromEmail: (email: string) => email.split('@')[1],
  utmSummary: () => 'no UTM data',
}));

vi.mock('./adapters/beehiiv', () => ({
  createBeehiivAdapter: () => ({ subscribe }),
}));

// Imported after the mocks above so index.ts picks up the mocked adapters.
const { default: worker } = await import('./index');

function makeEnv(): Env {
  return {
    ASSETS: { fetch: vi.fn(async () => new Response('static ok', { status: 200 })) } as never,
    ATTIO_API_KEY: 'test',
    BEEHIIV_API_KEY: 'test',
    BEEHIIV_PUBLICATION_ID: 'test',
  };
}

function post(path: string, body: unknown): Request {
  return new Request(`https://example.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Worker fetch router', () => {
  it('falls back to ASSETS for a non-API path', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://example.com/work-with-odd'), env);
    expect(await res.text()).toBe('static ok');
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it('404s an unknown /api/ route', async () => {
    const res = await worker.fetch(new Request('https://example.com/api/nope'), makeEnv());
    expect(res.status).toBe(404);
  });

  it('routes a valid business enquiry to the Attio adapter and returns ok:true', async () => {
    upsertCompany.mockResolvedValue({ id: 'company_1' });
    upsertPerson.mockResolvedValue({ id: 'person_1' });
    createOrUpdateDeal.mockResolvedValue({ id: 'deal_1' });

    const res = await worker.fetch(
      post('/api/business-enquiry', {
        name: 'Jane Doe',
        work_email: 'jane@examplecorp.com',
        organisation: 'Example Corp',
        interest: 'oddagency',
        goal: 'A brief',
      }),
      makeEnv(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(upsertCompany).toHaveBeenCalledOnce();
    expect(upsertPerson).toHaveBeenCalledOnce();
    expect(createOrUpdateDeal).toHaveBeenCalledOnce();
  });

  it('returns 400 with the validation message for an invalid enquiry, without calling Attio', async () => {
    const res = await worker.fetch(post('/api/business-enquiry', { name: 'Jane' }), makeEnv());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
    expect(body.message).toContain('work_email');
    expect(upsertCompany).not.toHaveBeenCalled();
  });

  it('returns a generic 502 (never the raw adapter error) when Attio throws', async () => {
    upsertCompany.mockRejectedValue(new Error('Attio /objects/... failed: 401 secret-details'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await worker.fetch(
      post('/api/business-enquiry', {
        name: 'Jane Doe',
        work_email: 'jane@examplecorp.com',
        organisation: 'Example Corp',
        interest: 'oddagency',
        goal: 'A brief',
      }),
      makeEnv(),
    );

    expect(res.status).toBe(502);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.message).not.toContain('401');
    expect(body.message).not.toContain('Attio');
    expect(consoleSpy).toHaveBeenCalled(); // the real error still gets logged server-side
    consoleSpy.mockRestore();
  });

  it('routes a valid newsletter subscribe to the beehiiv adapter', async () => {
    subscribe.mockResolvedValue({ status: 'subscribed' });
    const res = await worker.fetch(post('/api/newsletter', { email: 'a@b.com' }), makeEnv());
    expect(res.status).toBe(200);
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it('rejects a newsletter submission with the honeypot filled, without calling beehiiv', async () => {
    const res = await worker.fetch(
      post('/api/newsletter', { email: 'a@b.com', botcheck: 'spam' }),
      makeEnv(),
    );
    expect(res.status).toBe(400);
    expect(subscribe).not.toHaveBeenCalled();
  });
});
