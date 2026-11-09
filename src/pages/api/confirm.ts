import type { APIRoute } from 'astro';
import { byToken, confirm } from '../../lib/store';

// The link in the confirmation mail lands here: one click puts the address on
// the list. Re-opening the same link is harmless.
export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get('token') ?? '';
  const row = token ? byToken(token) : undefined;

  if (!row) {
    return new Response('That confirmation link is not valid any more.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  if (!row.confirmed_at) confirm(row.email);
  return redirect('/?newsletter=confirmed', 303);
};
