# Production Deployment Guide

## Build Commands
- `npm run build`
- `node scripts/perf-monitor.mjs`
- `./scripts/final-integration-test.sh`

## Environment Variables
- `VITE_API_URL` – REST API endpoint.
- `VITE_WS_URL` – WebSocket endpoint.
- `VITE_PWA_ENABLED` – Enable PWA features.
- `VITE_VOICE_ENABLED` – Toggle voice support (optional).

## Performance Targets
- Bundle size `< 400KB` (gzipped main bundle ~127KB).
- TTI `< 1.5s` with IndexedDB caching.
- Lighthouse `> 90` across Performance, Accessibility, Best Practices, SEO.
- Touch targets `≥ 44px` for mobile compliance.

## Deployment Steps
1. Ensure `.env.production` is configured with above variables.
2. Run `npm run build` to generate production assets.
3. Execute `node scripts/perf-monitor.mjs` to collect bundle metrics.
4. Run `./scripts/final-integration-test.sh` for final validation.
5. Deploy `dist/` contents via `wrangler pages deploy dist` (Cloudflare) or equivalent.
6. Monitor logs and real-time metrics via `scripts/perf-monitor.mjs` post-deploy.

## Rollback Plan
- Use `wrangler pages deployment rollback` or hosting provider rollback.
- Restore from previous build artifacts stored under `dist/` or CI artifacts.
