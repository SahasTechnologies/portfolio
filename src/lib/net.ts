// nest's IPv6 route to Cloudflare stalls, and Node happily tries it first. Ask
// for IPv4 first so Turnstile, CampaignLark and Lettermint keep answering.
import { setDefaultResultOrder } from 'node:dns';

try {
  setDefaultResultOrder('ipv4first');
} catch {
  /* a runtime without dns ordering keeps its default */
}
