// The one place this site talks to Web3Forms (web3forms.com), shared by
// /contact's form and /work-with-odd's partnerships notification.
//
// No backend of ours is involved: the access key is public by design (it
// identifies a recipient, it does not authorise anything), which is why it
// can sit in the page's HTML. What the key must never become is a list of
// people — see content.config.ts's `formAccessKeys` note on why each key
// points at a Google Group instead.

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export type Web3FormsFields = Record<string, unknown>;

/**
 * Posts one submission. Resolves true only when Web3Forms confirms it
 * accepted the message — never throws, so a caller can treat a failed
 * notification as one thing that went wrong rather than as the whole
 * submission failing.
 */
export async function submitToWeb3Forms(
  accessKey: string,
  fields: Web3FormsFields,
): Promise<boolean> {
  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...fields, access_key: accessKey }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
