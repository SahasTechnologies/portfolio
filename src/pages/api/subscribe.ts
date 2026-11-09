import type { APIRoute } from 'astro';
import { EMAIL_RE, json, limiter } from '../../lib/mail';
import { subscribeContact } from '../../lib/campaignlark';

// Newsletter signup: the address is forwarded to CampaignLark as unconfirmed,
// so the list, its double opt-in mail and its unsubscribes all stay there.
export const prerender = false;

const tooMany = limiter(5);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  // Bots fill the hidden field; answer like it worked and drop it.
  if (String(payload.website ?? '').trim()) return json({ ok: true });

  const email = String(payload.email ?? '').trim().toLowerCase();
  if (!email) return json({ ok: false, error: 'An email address is needed.' }, 400);
  if (email.length > 160 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'That email address looks off.' }, 400);
  }
  if (tooMany(clientAddress ?? 'unknown')) {
    return json({ ok: false, error: 'Too many signups just now — try again later.' }, 429);
  }

  const result = await subscribeContact(email);
  return result.ok ? json({ ok: true }) : json({ ok: false, error: result.error }, result.status);
};
