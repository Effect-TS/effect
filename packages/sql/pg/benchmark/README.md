# PostgreSQL codec benchmark

This benchmark compares the new `@effect/sql-pg` binary codecs with the native codec paths used by `postgres.js` and
`pg`. It runs entirely in one Node process. It does not open a database connection or include socket, TLS, query, or
server latency.

Run it from the repository root:

```sh
nix develop -c pnpm --filter @effect/sql-pg benchmark:codec
```

The encode and decode suites use the same six-column semantic row in all three libraries: `int4`, `bool`, `float8`,
`text`, `jsonb`, and `bytea`. Each sample processes 100 rows. `@effect/sql-pg` uses its binary wire representation;
`postgres.js` and `pg` use their normal text-oriented parameter and result codecs. Comparing rows per second is useful,
but the formats do different amounts of work and produce different byte representations.

The parser suites feed the exact same block of 100 `DataRow` frames to both parsers, first as one buffer and then in
64-byte chunks. `postgres.js` is absent from those two tables because its protocol parser is private and fused to live
connection and query state. Wrapping that state machine in a fake socket would measure client orchestration as well as
parsing, so it would not be an equivalent offline parser benchmark. Its exported serializers and parsers are still
included in the encode and decode tables.

Tinybench warms each task for 250 ms and measures it for one second. Results depend on the Node version, CPU, power
management, and other local load. Compare results from the same machine and runtime rather than treating one run as a
portable score.
