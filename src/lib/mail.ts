// Server-side mail through Lettermint's sending API. The project token is read
// from the environment and never reaches the browser.
const ENDPOINT = 'https://api.lettermint.co/v1/send';

export type MailOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tag?: string;
};

export type MailResult = { ok: true } | { ok: false; status: number; error: string };

export const mailFrom = (fallback: string) =>
  process.env.MAIL_FROM ?? process.env.CONTACT_FROM ?? fallback;

export const siteOrigin = (request: Request) =>
  (process.env.SITE_ORIGIN ?? new URL(request.url).origin).replace(/\/+$/, '');

export async function sendMail({ from, to, subject, text, html, replyTo, tag }: MailOptions): Promise<MailResult> {
  const token = process.env.LETTERMINT_PROJECT_TOKEN;
  if (!token) return { ok: false, status: 503, error: 'not_configured' };

  const body: Record<string, unknown> = { from, to: [to], subject, text };
  if (html) body.html = html;
  if (replyTo) body.reply_to = [replyTo];
  if (tag) body.tag = tag;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'x-lettermint-token': token, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error('mail: Lettermint rejected the message', tag ?? '', res.status, await res.text());
      return { ok: false, status: 502, error: 'The mail service refused it — try again later.' };
    }
  } catch (error) {
    console.error('mail: could not reach Lettermint', error);
    return { ok: false, status: 502, error: 'Could not reach the mail service — try again?' };
  }

  return { ok: true };
}

// Shared per-IP limiter for the small public endpoints.
export function limiter(max: number, windowMs = 60 * 60 * 1000) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length > max;
  };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
