# portfolio

Personal site for Sahas — an Astro app rendered on the server, so every reload shows a
different pixel animation in place of "Sahas".

```
src/animations/     one file per pixel animation (SVG + its own CSS), extracted from
                    the "Sahas — animation studies" export
src/scripts/        pointer interactions for those animations
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

## Deployment

Pushes to `main` build the site in GitHub Actions, ship the release tarball to nest, unpack
it into `/var/deployments/portfolio/releases/<release>`, swap the `/var/www/portfolio`
symlink and restart the `portfolio` service. Caddy reverse-proxies the site domains to
`127.0.0.1:4321`; the deploy script rolls back to the previous release if the health check
fails and keeps the three newest releases.

Required repository secrets: `NEST_HOST`, `NEST_USER`, `NEST_PORT`, `NEST_SSH_KEY`.
