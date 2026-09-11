---
"@effect/sql-pg": patch
---

Support `sslmode=prefer` and `sslmode=allow` in connection URLs with libpq semantics.

Both modes now send `SSLRequest` and upgrade to TLS when the server answers `S`, or continue over the same plaintext socket when it answers `N`, instead of failing configuration with `sslmode "prefer" is not supported`. Cancel requests follow the same negotiation. An explicit `ssl` option still overrides the URL.

```ts
// Hyperdrive local dev, Neon/Supabase pooler URLs, libpq default, ...
PgClient.layer({ url: Redacted.make("postgres://user:pw@host/db?sslmode=prefer") })
```
