# @effect/sql-pg

An Effect SQL client for PostgreSQL with a native wire-protocol driver.

## Installation

```sh
npm install effect@rc @effect/sql-pg@rc
```

## Session defaults

Use `startupParameters` to establish PostgreSQL session defaults when each physical
connection opens, including replacement connections in a pool:

```ts
import { PgClient } from "@effect/sql-pg"
import { Redacted } from "effect"

const PostgresLive = PgClient.layer({
  url: Redacted.make("postgres://user:password@localhost/app"),
  startupParameters: {
    statement_timeout: "5s",
    search_path: "app, public"
  },
  startupOptions: "-c lock_timeout=1000"
})
```

These settings are sent in the startup packet. PostgreSQL's `RESET ALL` restores
the startup defaults after session-level changes. Both `PgConnection.Config` and
`PgClientConfig` accept these fields, and pools inherit them.

Parameter names are normalized to lowercase. Empty names and NUL bytes in names
or values are rejected before connecting. The names `user`, `database`,
`replication`, and `options` are reserved; use `username`, `database`, and `startupOptions`
on the config for identity and opaque options. Replication mode is not supported
through `startupParameters`. The driver accepts only `UTF8` or `UTF-8`
(case-insensitive) for `client_encoding` and sends the canonical value `UTF8`.
PostgreSQL validates other settings and reports invalid names or values at connect
time.

The `startupOptions` field is an opaque PostgreSQL options string. It can also come
from the URL query, for example `?options=-c%20statement_timeout%3D5000`. Explicit
config `startupOptions` overrides URL `options`, including when the explicit value
is empty. The URL query key and startup packet field are both named `options`.
Named parameters and opaque options can be sent together, but callers must not
set the same GUC in both. The driver does not parse `-c` flags, detect conflicts,
or read `PGOPTIONS`.

The startup `application_name` is selected in this order:

1. Explicit `applicationName`
2. `startupParameters.application_name`
3. URL `application_name`
4. `"@effect/sql-pg"`

The driver does not extract `application_name` from the opaque options string.

## User-defined types

Columns whose type OID has no codec are decoded as UTF-8 text, so user-defined
enums read as plain strings:

```ts
import { PgClient } from "@effect/sql-pg"
import { Effect } from "effect"

// CREATE TYPE capability AS ENUM ('use_key', 'manage')
const program = Effect.gen(function*() {
  const sql = yield* PgClient.PgClient
  const rows = yield* sql`SELECT 'use_key'::capability AS capability`
  // rows[0].capability === "use_key"
})
```

Strings bind to enum columns without any setup; the server infers the type.

The fallback applies to every OID without a codec, not only enums, and it has
two failure modes:

- Invalid UTF-8 fails with `PgTypes.CodecError`, as it does for `text`. A codec
  failure while reading a row is fatal to the connection, not just to the
  query: the socket is destroyed, every other query pipelined on that
  connection fails, an open transaction is lost, `LISTEN` channels on it are
  torn down, and the pool replaces the connection. Columns of a binary
  user-defined type such as a composite, a PostGIS geometry, or a pgvector
  `vector` hold bytes that are usually not valid UTF-8, so register a codec
  before querying them.
- Bytes that happen to be valid UTF-8 decode as garbled text without any
  error. Arrays of user-defined types, including enum arrays, land here: the
  array header is all low bytes, so a `capability[]` column reads as a string
  of control characters followed by the labels.

Register a codec for a scalar user-defined type with
`PgTypes.register(oid, codec)`; registered codecs take precedence over the
fallback. `PgTypes.register` cannot attach an array type. For arrays, create a
registry, register the element codec with its `arrayOid`, and pass the registry
to the client as `types`. The registry builds the array codec from the element
codec:

```ts
import { PgClient, PgTypes } from "@effect/sql-pg"
import { Redacted, Result } from "effect"

// SELECT oid, typarray FROM pg_type WHERE typname = 'capability'
declare const capabilityOid: number
declare const capabilityArrayOid: number

const decoder = new TextDecoder("utf-8", { fatal: true })

const utf8: PgTypes.Codec<string> = {
  encode: (value) => Result.succeed(new TextEncoder().encode(value)),
  decode: (bytes) => {
    try {
      return Result.succeed(decoder.decode(bytes))
    } catch {
      return Result.fail(new PgTypes.CodecError({ message: "Invalid UTF-8 in capability" }))
    }
  }
}

const types = PgTypes.makeRegistry()
types.register(capabilityOid, utf8, { arrayOid: capabilityArrayOid })

const PostgresLive = PgClient.layer({
  url: Redacted.make("postgres://user:password@localhost/app"),
  types
})
```

OIDs of user-defined types are assigned per database, so look them up in
`pg_type` at startup rather than hard-coding them.

## Documentation

- [Effect website](https://effect.website)
- [API reference](https://effect.website/docs/v4/api/sql-pg)
