# portfolio

Personal site for Sahas — an Astro app rendered on the server, so every reload shows a
different pixel animation in place of "Sahas".

```
src/animations/     one file per pixel animation (SVG + its own CSS), extracted from
                    the "Sahas — animation studies" export
src/scripts/        pointer interactions for those animations (the same code the studies page runs)
src/pages/index.astro   picks an animation on the server for each request
deploy/             systemd unit + release script used by the deploy workflow
```

## Local development

```sh
npm install
npm run dev          # http://localhost:4321
```

## Build and run

```sh
npm run build
npm start            # serves dist/server/entry.mjs on $PORT (default 4321)
```

Requires Node 26 (the release on nest runs `/usr/local/bin/node`).

## Contact form

`src/pages/api/contact.ts` posts the form to Lettermint's sending API
(`POST https://api.lettermint.co/v1/send`, `x-lettermint-token` header), so the address it
delivers to never appears in the page markup. Server variables, loaded by the systemd unit
from files outside every release:

```
/etc/portfolio-mail.env   LETTERMINT_PROJECT_TOKEN=lm_...              # written by the deploy workflow
                          CONTACT_TO=sahas.shimpi@outlook.com       # from the CONTACT_TO secret
                          MAIL_FROM=Portfolio <contact@send.shimpi.dev>   # from the MAIL_FROM secret
                          CAMPAIGNLARK_API_KEY=...                  # from the CAMPAIGNLARK_API_KEY secret
                          TURNSTILE_SECRET_KEY=...                  # from the TURNSTILE_SECRET_KEY secret
/etc/portfolio.env        SITE_ORIGIN=https://www.shimpi.dev
```

Without a token the form still renders but `POST /api/contact` answers
`503 {"ok":false,"error":"not_configured"}`. The endpoint also drops honeypot submissions and
rate-limits each IP to five messages an hour.

The sender has to sit on a domain verified in the Lettermint project (`onboarding@lettermint.dev`
works out of the box for a test send; `send.shimpi.dev` needs its DNS records published in
Lettermint first).

## Newsletter

The signup form on the page posts to `/api/subscribe`, which forwards the address to
CampaignLark (`POST https://api.campaignlark.com/v1/contacts`, `Bearer` workspace key) with
status `UNCONFIRMED`. That is CampaignLark's double opt-in path: they mail the confirmation
link and only promote the contact once it is opened, and they own the list, the unsubscribes
and the bounce handling. Nothing is stored on nest, and an address already on the list gets
the same answer as a new one so the form never leaks who is subscribed.

## Deployment

Pushes to `main` build the site in GitHub Actions, ship the release tarball to nest, unpack
it into `/var/deployments/portfolio/releases/<release>`, swap the `/var/www/portfolio`
symlink and restart the `portfolio` service. Caddy reverse-proxies the site domains to
`127.0.0.1:4321`; the deploy script rolls back to the previous release if the health check
fails and keeps the three newest releases.

The workflow prefers nest's own IPv6 address (`NEST_DIRECT_HOST`, key `NEST_DEPLOY_KEY`),
where the box's OpenSSH 10 negotiates ML-KEM post-quantum key exchange, and falls back to
the hackclub SSH proxy (`NEST_HOST` / `NEST_SSH_KEY`) for networks without IPv6 — that proxy
only offers `curve25519-sha256`, which is what produces the "store now, decrypt later"
notice. GitHub-hosted runners are IPv4-only, so in practice deploys ride the proxy unless
hackclub upgrades it.

Required repository secrets: `NEST_HOST`, `NEST_USER`, `NEST_PORT`, `NEST_SSH_KEY`,
`NEST_DIRECT_HOST`, `NEST_DEPLOY_KEY`.
