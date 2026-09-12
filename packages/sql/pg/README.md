# @effect/sql-pg

An Effect SQL client for PostgreSQL with a native PostgreSQL wire-protocol implementation.

## Installation

```sh
npm install effect@rc @effect/sql-pg@rc
```

## Session defaults

Use `startupParameters` to establish session defaults without additional SQL queries. This structured interface sends names and values directly in PostgreSQL's startup packet, so callers do not need to serialize settings into an `options` string or escape spaces and backslashes for PostgreSQL's argument parser:

```ts
import { PgClient } from "@effect/sql-pg"
import { Redacted } from "effect"

const PgLive = PgClient.layer({
  url: Redacted.make("postgres://user:password@localhost/database"),
  startupParameters: {
    statement_timeout: "10s",
    random_page_cost: "4",
    search_path: "app,public"
  }
})
```

`PgConnection.make` and `PgPool.make` accept the same parameters. Each physical connection sends them in its startup packet, including replacement pooled connections. PostgreSQL treats them as session defaults: `RESET ALL` restores them.

For compatibility with node-postgres, `options` accepts a PostgreSQL backend-options string such as `"-c statement_timeout=10s"`. It can also come from the URL query (`?options=-c%20statement_timeout%3D10s`). Explicit `options` takes precedence over URL `options`; an explicit empty string clears URL options. The URL query is decoded once and the resulting string is forwarded unchanged. PostgreSQL parses and validates it; the driver does not implement an options parser.

PostgreSQL applies direct `startupParameters` after `options`, so direct settings override options for the same name. Application-name precedence is `applicationName`, then `startupParameters.application_name`, then URL `application_name`, then `@effect/sql-pg`. The resulting application name and the driver's UTF-8 encoding are sent directly and override settings in `options`. An explicitly empty application name is preserved.

Parameter names are normalized to lowercase. `client_encoding` accepts only `UTF8` or `UTF-8` (case-insensitively), because the driver encodes and decodes text as UTF-8. Identity and protocol-control parameters (`user`, `database`, `replication`, `options`, and `_pq_.*`) are reserved. Use the existing connection fields for identity. Empty names and NUL bytes in names or values are rejected before connecting; PostgreSQL validates other setting names and values.

NUL bytes in `options` are rejected before connecting. Other backend-option errors are reported by PostgreSQL during startup.

The driver does not automatically read `PGOPTIONS`. Applications that need environment-based configuration can resolve it themselves and pass the value as `options`.

## Documentation

- [Effect website](https://effect.website)
- [API reference](https://effect.website/docs/v4/api/sql-pg)
