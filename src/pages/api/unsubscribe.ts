import type { APIRoute } from 'astro';
import { byToken, unsubscribe } from '../../lib/store';

// One-click unsubscribe, linked from every confirmation mail.
export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get('token') ?? '';
  const row = token ? byToken(token) : undefined;

  if (!row) {
    return new Response('That unsubscribe link is not valid any more.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  if (!row.unsubscribed_at) unsubscribe(row.email);
  return redirect('/?newsletter=unsubscribed', 303);
};
