// Newsletter signups go to CampaignLark, which owns the list and the double
// opt-in mail. The workspace key stays on the server and never reaches the page.
const ENDPOINT = 'https://api.campaignlark.com/v1/contacts';

export type SubscribeResult = { ok: true } | { ok: false; status: number; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function subscribeContact(email: string): Promise<SubscribeResult> {
  const key = process.env.CAMPAIGNLARK_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'not_configured' };

  // The box's link out to Cloudflare drops now and then; a couple of quick
  // retries turn that into a slightly slow signup instead of a failed one.
  let failure = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(12_000),
        // UNCONFIRMED is CampaignLark's double opt-in path: they mail the
        // confirmation link and only promote the contact once it is opened.
        body: JSON.stringify({ fields: { email_address: email }, status: 'UNCONFIRMED' }),
      });

      if (res.ok) return { ok: true };

      const detail = await res.text();
      // Already on the list: answer exactly like a fresh signup, so the form can
      // never be used to find out who is subscribed.
      if (res.status === 400 && /exist/i.test(detail)) return { ok: true };

      // A 5xx from their edge is worth another go; a 4xx is not.
      if (res.status < 500) {
        console.error('campaignlark: signup rejected', res.status, detail);
        return { ok: false, status: 502, error: 'The newsletter service refused it — try again later.' };
      }
      failure = `signup refused with ${res.status}`;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 2) await sleep(400 * (attempt + 1));
  }

  console.error('campaignlark: could not reach the API', failure);
  return { ok: false, status: 502, error: 'Could not reach the newsletter service — try again?' };
}
