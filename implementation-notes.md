# Implementation notes

## Deviations

- 2026-10-01 (no loopback in prod): plan said to find any API client using the localhost default and guard it; territory: `api/client.ts` (axios `apiClient`) already defaults to `''` (relative, Vite proxy in dev) and never reaches loopback. Left it unchanged; only SettingsPanel's `/health` probe and the App.tsx app switcher carried loopback defaults.
