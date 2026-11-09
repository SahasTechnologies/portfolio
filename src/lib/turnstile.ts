// Server-side Turnstile check. A widget token is single-use and is redeemed here,
// so the browser only ever holds a short-lived token, never the secret.
const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ATTEMPTS = 3;

export type TurnstileResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const allowedHostnames = () =>
  (process.env.TURNSTILE_HOSTNAMES ?? 'www.shimpi.dev')
    .split(',')
    .map((hostname) => hostname.trim())
    .filter(Boolean);

const refuse = (): TurnstileResult => ({
  ok: false,
  status: 403,
  error: 'Could not verify that you are human — try again?',
});

export async function verifyTurnstile(
  token: unknown,
  action: string,
  remoteip?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, status: 503, error: 'not_configured' };

  const value = typeof token === 'string' ? token.trim() : '';
  if (!value || value.length > 2048) return refuse();

  // nest's route to Cloudflare drops now and then. A timed-out attempt never
  // redeemed the token, so the same token can be sent again.
  let failure = '';
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(8000),
        body: new URLSearchParams({
          secret,
          response: value,
          ...(remoteip ? { remoteip } : {}),
        }),
      });

      if (!res.ok) {
        failure = `siteverify ${res.status}`;
      } else {
        const result = (await res.json()) as {
          success?: boolean;
          action?: string;
          hostname?: string;
        };
        if (
          result.success &&
          result.action === action &&
          allowedHostnames().includes(result.hostname ?? '')
        ) {
          return { ok: true };
        }
        // A real verdict, not a transport problem: retrying can't change it.
        console.error('turnstile: rejected', result.action, result.hostname);
        return refuse();
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (attempt < ATTEMPTS - 1) await sleep(300 * (attempt + 1));
  }

  console.error('turnstile: siteverify failed', failure);
  return refuse();
}
