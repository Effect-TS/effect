# PostgreSQL codec benchmark

This benchmark compares the new `@effect/sql-pg` binary codecs with the native codec paths used by `postgres.js` and
`pg`. It runs entirely in one Node process. It does not open a database connection or include socket, TLS, query, or
server latency.

Run it from the repository root:

```sh
nix develop -c pnpm --filter @effect/sql-pg benchmark:codec
```

Every suite uses the same six-column semantic row: `int4`, `bool`, `float8`, `text`, `jsonb`, and `bytea`. Each sample
processes 100 rows. `@effect/sql-pg` uses its binary wire representation; `postgres.js` and `pg` use their normal
text-oriented codecs, so the byte layouts differ even where the values match.

## The end-to-end suites

`Bind frame from JavaScript values` and `DataRow frames to JavaScript values` are the comparisons to read first. They
measure the same job for both libraries: JavaScript values in, a complete `Bind` frame out, and `DataRow` frames in,
JavaScript values out. `pg` is represented by `pg-protocol`'s `serialize.bind` with `utils.prepareValue` as its value
mapper, and by its `Parser` feeding `pg-types` text parsers - the same calls `pg` makes when it runs a query.

The `Bind` suite runs `@effect/sql-pg` twice. `value sink` is `PgProtocol.makeBindEncoder(PgTypes.writeParameter)`,
which writes each value straight into the frame; it is what a client should use. `encoded parameters` is
`PgProtocol.encodeBind` over `PgTypes.encode` output, which allocates an array per parameter and copies it into the
frame. Both produce the same bytes.

## The component suites

The four remaining suites split that work up, which is useful for finding hot spots but not for ranking the libraries:

- `type encode` looks unfavourable to the binary codec because `pg`'s `prepareValue` mostly hands the value straight
  back. It produces no wire bytes at all; that work happens later, in its `Bind` serializer.
- `type decode` is the mirror image: `pg`'s text parsers are handed strings its protocol parser already built, so the
  bytes-to-string step it charges to the parser is charged here for the binary codec.
- The two parser suites feed the same block of 100 `DataRow` frames to both parsers, first as one buffer and then in
  64-byte chunks. `postgres.js` is absent from those two tables because its protocol parser is private and fused to
  live connection and query state. Wrapping that state machine in a fake socket would measure client orchestration as
  well as parsing, so it would not be an equivalent offline parser benchmark. Its exported serializers and parsers are
  still included in the encode and decode tables.

Tinybench warms each task for 250 ms and measures it for one second. Results depend on the Node version, CPU, power
management, and other local load. Compare results from the same machine and runtime rather than treating one run as a
portable score.
