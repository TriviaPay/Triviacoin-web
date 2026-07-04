# Vercel + Cloudflare Deployment

This repo is a Vite React single-page app. Vercel should build it with `npm run build` and serve the `dist` directory.

## 1. Vercel project

This project is already connected in Vercel:

```text
https://vercel.com/triviapays-projects/miragaming-frontend/
```

Keep these Vercel project settings:

   - Framework preset: `Vite`
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`

Add the environment variables from `.env.example` in Vercel Project Settings -> Environment Variables, and make sure Production and Preview have the right API/auth/ad values.

## 2. GitHub checks

Vercel's Git integration handles preview and production deployments. GitHub Actions only runs repo checks:

- `npm ci`
- `npm run typecheck`
- `npm run build`
- Vercel config JSON validation
- `.env.example` presence
- Non-blocking lint report while the existing lint backlog is cleaned up

## 3. Cloudflare DNS

In Vercel Project Settings -> Domains, add your domain first. Vercel will show the exact DNS records to create in Cloudflare.

Typical setup:

- Apex/root domain, such as `example.com`: `A` record to `76.76.21.21`
- `www` subdomain, such as `www.example.com`: `CNAME` record to the Vercel DNS target shown in the Vercel dashboard

Recommended Cloudflare settings:

- Proxy status: start with DNS only while Vercel verifies the domain. After verification, you can enable the proxy if needed.
- SSL/TLS mode: `Full` or `Full (strict)`.
- Do not create Cloudflare page rules that redirect paths away from Vercel unless intentional.

## 4. Deployment behavior

- Pull requests create Vercel preview deployments through Vercel's Git integration.
- Pushes to `main` create production deployments through Vercel's Git integration.
- GitHub Actions runs checks only; it does not deploy or require Vercel tokens.
- `vercel.json` rewrites non-asset paths to `index.html`, so `/success`, `/cancel`, and other client-side routes work on page refresh.

## 5. Local checks

Before pushing:

```sh
npm ci
npm run lint
npm run build
```

`npm run lint` currently reports pre-existing code quality issues. It is useful locally, but it is not a deployment gate until those issues are cleaned up.
