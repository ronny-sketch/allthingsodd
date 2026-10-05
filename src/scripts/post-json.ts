// One POST to a Growth OS route for the three simple forms (contact, Work
// with ODD, newsletter). It is bounded, so a stalled request ends instead
// of leaving the button on "Sending…" forever. The answer is read strictly:
// success needs a 2xx AND `{ ok: true, message }`. A 2xx with an HTML page,
// an empty body or no `ok` is not success.
//
// No automatic retry. These routes write a CRM record, send an email or add
// a subscriber, and none of them has an idempotency key, so a retry could do
// it twice. The visitor's answers stay in the form and they decide.

export type PostResult =
  | { kind: 'ok'; message: string }
  /** The Worker answered and said no, in its own words (validation, 429, outage). */
  | { kind: 'refused'; message: string }
  /** Timed out: it may or may not have arrived. */
  | { kind: 'timeout' }
  /** No usable answer: offline, blocked, or not the Worker's JSON. */
  | { kind: 'failed' };

export const POST_TIMEOUT_MS = 15_000;

export async function postJson(
  url: string,
  payload: unknown,
  timeoutMs = POST_TIMEOUT_MS,
): Promise<PostResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => null)) as { ok?: unknown; message?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message : '';
    if (res.ok && body?.ok === true && message) return { kind: 'ok', message };
    if (body?.ok === false && message) return { kind: 'refused', message };
    return { kind: 'failed' };
  } catch {
    return controller.signal.aborted ? { kind: 'timeout' } : { kind: 'failed' };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Wording for the two answers that are not the Worker's own. */
export function failureText(kind: 'timeout' | 'failed', fallback: string): string {
  return kind === 'timeout'
    ? `This is taking too long, and we can't tell whether it reached us. It may have. Before sending it again, wait a minute, or ${fallback}.`
    : `Something went wrong and this was not sent. Your answers are still here: try again, or ${fallback}.`;
}
