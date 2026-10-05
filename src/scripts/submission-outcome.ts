// What a Growth OS intake route's answer means, read strictly. Shared by
// the Creative Week form and the venue quote form, whose Worker routes answer
// the same way (../odd-growth-os worker/src/creative-week/handler.ts and
// booking/handler.ts, D33/D33a):
//
//   200 delivered        in Notion
//   202 queued           stored, the Worker retries until it lands
//   202 emailed          a person was emailed every answer
//   409 conflict         this submission id already has a copy with other
//                        answers; that copy is kept, these edits are not
//   400 invalid          per-field errors
//   429                  rate limited
//
// Success only for the three kept states, and only with this submission's
// own id echoed back. Anything else, including a 2xx that does not say so,
// an empty body or an HTML error page, is a failure the visitor can retry
// with the same id, which the Worker dedupes on.

export type Outcome =
  | { kind: 'delivered' | 'queued' | 'emailed' }
  | { kind: 'invalid'; errors: Record<string, string> }
  | { kind: 'conflict' }
  | { kind: 'rate_limited' }
  | { kind: 'failed' };

const SUCCESS: Record<number, string[]> = { 200: ['delivered'], 202: ['queued', 'emailed'] };

export function readOutcome(status: number | null, body: unknown, submissionId: string): Outcome {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (status !== null && SUCCESS[status]?.includes(b.status as string)) {
    if (b.ok === true && b.submission_id === submissionId) {
      return { kind: b.status as 'delivered' | 'queued' | 'emailed' };
    }
    return { kind: 'failed' };
  }
  if (status === 400 && b.status === 'invalid' && b.errors && typeof b.errors === 'object') {
    return { kind: 'invalid', errors: b.errors as Record<string, string> };
  }
  if (status === 409 && b.status === 'conflict' && b.submission_id === submissionId) {
    return { kind: 'conflict' };
  }
  if (status === 429) return { kind: 'rate_limited' };
  return { kind: 'failed' };
}
