# Customer distribution simulation

`Customer-1/`, `Customer-2/`, `Customer-3/` (at the repo root) simulate
three separate customer environments. Each can have its own frontend
version and backend version deployed and running at the same time, on its
own dedicated ports, driven from the **Customers** section of the build
dashboard (`npm run dashboard`, then http://127.0.0.1:5055).

For a chosen customer, pick a frontend version (a `shell-v*` tag) and/or a
backend version (a `backend-v*` tag) and click **Deploy**. That:

1. Stops anything already running for that customer.
2. Reads which apps/services that version's tag recorded (from its
   release commit message, e.g. `apps: sales,analytics`) and rebuilds
   them via the existing `build-apps.mjs` / `build-services.mjs` scripts
   (with `--no-release`, so this never bumps versions or touches git).
3. Copies the output into `Customer-N/frontend/` and `Customer-N/backend/`
   (each with a `DEPLOYED.json` recording what's there).
4. Starts the frontend (a small static file server, `static-server.mjs`,
   with an SPA fallback for client-side routing) and each deployed
   backend jar (`java -jar ... --server.port=<port>`) on that customer's
   ports.

**Stop** kills whatever's running for that customer via tracked PID files
(`Customer-N/pids/`); logs land in `Customer-N/logs/`.

## Ports

Fixed per customer so all three - plus your own main dev servers on
5173/8080-8083 - can run simultaneously without colliding:

| | frontend | api-gateway | sales | service | analytics |
|---|---|---|---|---|---|
| Customer-1 | 9010 | 8180 | 8181 | 8182 | 8183 |
| Customer-2 | 9020 | 8280 | 8281 | 8282 | 8283 |
| Customer-3 | 9030 | 8380 | 8381 | 8382 | 8383 |

Only the services a given backend version actually included get started -
e.g. a version tagged with `services: sales-service` only starts that one
jar on its port, the others stay down.

## Known limitation: not a true historical rebuild

"Deploy version X" rebuilds from the **current checked-out source**, using
only the app/service subset recorded at that tag - it does not check out
that tag's actual historical source code (no `git worktree`, no per-tag
`npm install`). For this repo so far every tag differs only in version
number and enabled subset, not application code, so this hasn't mattered
in practice - the `DEPLOYED.json` files are honest about it, recording the
tag you asked for *and* the real build output (e.g. the actual jar
filename), which can diverge once source changes between releases. A
byte-for-byte reproduction would need a `git worktree` checkout plus a
fresh install per deploy; this trades that for an instant, dependency-free
deploy suited to a local demo.
