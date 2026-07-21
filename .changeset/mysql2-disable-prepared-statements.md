---
"@effect/sql-mysql2": patch
---

Add `disablePreparedStatements` to `MysqlClientConfig`, running every statement over the MySQL text protocol (`connection.query`) instead of prepared statements (`connection.execute` / `COM_STMT_PREPARE`).

Some MySQL proxies do not support the binary protocol — Cloudflare Hyperdrive rejects every prepared statement with "Hyperdrive does not currently support MySQL COM_STMT_PREPARE messages", which previously made this client unusable behind it. mysql2 still escapes parameters client-side on the text path, so parameterization is preserved. Streaming already used the text protocol and is unchanged.

```ts
MysqlClient.layer({
  url: Redacted.make(env.HYPERDRIVE.connectionString),
  disablePreparedStatements: true,
  // mysql2's JIT row parsers use `new Function`, which workerd disallows
  poolConfig: { disableEval: true }
})
```

`poolConfig` is now also applied when `url` is set (it was previously ignored on that path), so options like `disableEval` can be combined with a connection URI.
