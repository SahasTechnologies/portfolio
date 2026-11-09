// Server-side Turnstile check. A widget token is single-use and is redeemed here,
// so the browser only ever holds a short-lived token, never the secret.
const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const allowedHostnames = () =>
  (process.env.TURNSTILE_HOSTNAMES ?? 'www.shimpi.dev')
    .split(',')
    .map((hostname) => hostname.trim())
    .filter(Boolean);

export async function verifyTurnstile(
  token: unknown,
  action: string,
  remoteip?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, status: 503, error: 'not_configured' };

  const value = typeof token === 'string' ? token.trim() : '';
  if (!value || value.length > 2048) {
    return { ok: false, status: 403, error: 'Could not verify that you are human — try again?' };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: value,
        ...(remoteip ? { remoteip } : {}),
      }),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);

    const result = (await res.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    if (
      !result.success ||
      result.action !== action ||
      !allowedHostnames().includes(result.hostname ?? '')
    ) {
      console.error('turnstile: rejected', result.action, result.hostname);
      return { ok: false, status: 403, error: 'Could not verify that you are human — try again?' };
    }
    return { ok: true };
  } catch (error) {
    console.error('turnstile: siteverify failed', error);
    return { ok: false, status: 403, error: 'Could not verify that you are human — try again?' };
  }
}
