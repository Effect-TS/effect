# @effect/sql-pg

An Effect SQL client for PostgreSQL with a native PostgreSQL wire-protocol implementation.

## Installation

```sh
npm install effect@rc @effect/sql-pg@rc
```

## Session defaults

Use PostgreSQL `options` to establish session defaults without additional SQL queries:

```ts
import { PgClient } from "@effect/sql-pg"
import { Redacted } from "effect"

const PgLive = PgClient.layer({
  url: Redacted.make("postgres://user:password@localhost/database"),
  options: "-c statement_timeout=10s -c random_page_cost=4 -c search_path=app,public"
})
```

`PgConnection.make` and `PgPool.make` accept the same options. Each physical connection sends them in its startup packet, including replacement pooled connections. PostgreSQL treats the settings as session defaults: `RESET ALL` restores them.

For compatibility with node-postgres, `options` accepts a PostgreSQL backend-options string such as `"-c statement_timeout=10s"`. It can also come from the URL query (`?options=-c%20statement_timeout%3D10s`). Explicit `options` takes precedence over URL `options`; an explicit empty string clears URL options. The URL query is decoded once and the resulting string is forwarded unchanged. PostgreSQL parses and validates it; the driver does not implement an options parser.

Application-name precedence is `applicationName`, then URL `application_name`, then `@effect/sql-pg`. The resulting application name and the driver's UTF-8 encoding are sent directly and override settings in `options`. An explicitly empty application name is preserved.

NUL bytes in `options` are rejected before connecting. Other backend-option errors are reported by PostgreSQL during startup.

The driver does not automatically read `PGOPTIONS`. Applications that need environment-based configuration can resolve it themselves and pass the value as `options`.

## Documentation

- [Effect website](https://effect.website)
- [API reference](https://effect.website/docs/v4/api/sql-pg)
