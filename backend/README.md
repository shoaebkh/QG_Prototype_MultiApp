# backend

Four independently runnable Spring Boot services behind a thin aggregator
pom (`backend/pom.xml`, packaging `pom`, exists only so `mvn clean package`
can build all of them in one command). No service depends on another
service - only on the `common`/`events` libraries - so any subset of them
can be built and deployed on its own:

| Service | Port | Mirrors |
|---|---|---|
| `api-gateway` | 8080 | `apps/shell` (app catalog) |
| `sales-service` | 8081 | `@multiapp/app-sales` |
| `service-service` | 8082 | `@multiapp/app-service` |
| `analytics-service` | 8083 | `@multiapp/app-analytics` |

All modules (including `common`/`events`) share one Maven version, since
every module's pom has `<parent>com.multiapp:backend:<version></parent>`.

## Database

`sales-service` and `service-service` persist to a shared local Postgres
database, `ERP_Prototype` (which also has unrelated tables from another
project on this machine - `lead`/`case_record` are the only ones these
two services touch). Connection (overridable via `DB_URL`/`DB_USERNAME`/
`DB_PASSWORD` env vars, defaults match the local dev instance):

```
jdbc:postgresql://localhost:5433/ERP_Prototype
postgres / postgres
```

`spring.jpa.hibernate.ddl-auto` is `validate`, not `update` - the schema
is owned by `backend/scripts/erp-prototype-schema.sql`, not Hibernate.
Run that script once against a fresh database before starting either
service for the first time:

```bash
psql -h localhost -p 5433 -U postgres -d ERP_Prototype -f backend/scripts/erp-prototype-schema.sql
```

`analytics-service` and `api-gateway` have no database of their own.

## Building a subset of services

Use `backend/scripts/build-services.mjs` (wired up as the root
`build:backend` npm script) - the backend counterpart of
`apps/shell/scripts/build-apps.mjs`. It discovers buildable service ids from
`backend/*/pom.xml` (any module declaring `spring-boot-maven-plugin`, i.e.
independently runnable); `common`/`events` aren't selectable since they're
plain libraries pulled in automatically by Maven's `-am` flag.

From the repo root:

```bash
npm run build:backend -- sales-service,analytics-service
```

This runs `mvn clean package -pl sales-service,analytics-service -am` from
`backend/`, producing jars only for the requested services (plus `common`
and `events`, which they depend on) at
`backend/<service>/target/<service>-<version>.jar`.

Invalid service ids print the available list and exit non-zero:

```bash
npm run build:backend -- sales-service,bogus
# Unknown service id(s): bogus
# Usage: build-services.mjs <service-id>[,<service-id>...] ...
# Available services: analytics-service, api-gateway, sales-service, service-service
```

## Versioning releases

Same release model as the frontend script, in a separate tag namespace:

```bash
npm run build:backend -- sales-service,analytics-service                    # patch bump
npm run build:backend -- sales-service,analytics-service --bump minor
npm run build:backend -- sales-service,analytics-service --set-version 2.5.0
npm run build:backend -- sales-service,analytics-service --no-release       # build only
```

A successful build also bumps the shared Maven version (via
`mvn versions:set`, which updates `backend/pom.xml` and every module's
`<parent>` version together - even modules not in this build, since they
all share one version), commits just that change, and tags it
`backend-v<version>` (distinct from the frontend's `shell-v<version>`
tags). Maven's `-SNAPSHOT` suffix is dropped on release - every tagged
build here is a concrete released version, not a pre-release snapshot.

Same safety rules as the frontend script: the release step requires a
clean working tree (commit your fix first), is skipped with a warning if
there's no git repo, refuses to reuse an existing tag, and never pushes
automatically - push yourself when ready:
```bash
git push && git push --tags
```

## Build dashboard

`npm run dashboard` (from the repo root) includes a "Backend" section
alongside the frontend one - current version, a checklist of services, and
a Build button that runs the exact flow above from a browser. See
`tools/build-dashboard/`.

The dashboard's Customers section deploys a chosen backend version (one of
these jars) to a simulated customer environment and runs it on that
customer's dedicated port - see `tools/deploy/README.md`.

## CI / release automation

- `.github/workflows/ci.yml` builds every module (`mvn clean package`, no
  subset) on every push/PR to `master` - the broadest compile check.
- `.github/workflows/release-backend.yml` triggers on `backend-v*` tag
  pushes, re-parses the service list from that release's commit message,
  rebuilds just those services, and attaches their jars to a GitHub
  Release for the tag.

## Known gap: cross-service calls

`sales-service` and `analytics-service` both call `service-service` over
HTTP (`RestClientConfig.java` in each, hitting `/api/service/cases`) -
Sales' "Convert to Case" endpoint and Analytics' `/api/analytics/summary`
specifically. If you deploy a subset that excludes `service-service`,
those two endpoints fail at runtime (connection refused) - everything else
works fine. See `apps/shell/README.md` for the frontend side of this same
gap.
