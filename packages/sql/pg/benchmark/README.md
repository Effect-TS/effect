# PostgreSQL codec benchmark

This benchmark compares the `@effect/sql-pg` binary codecs with the native codec paths used by `postgres.js`. It runs
entirely in one Node process. It does not open a database connection or include socket, TLS, query, or server latency.

Run it from the repository root:

```sh
nix develop -c pnpm --filter @effect/sql-pg benchmark:codec
```

Every suite but one uses the same six-column semantic row: `int4`, `bool`, `float8`, `text`, `jsonb`, and `bytea`;
`int4[] decode` uses a 16-element `int4` array instead, because an array is where a value's cost is paid per element.
Each sample processes 100 rows. `@effect/sql-pg` uses its binary wire representation and `postgres.js` uses its normal
text-oriented codecs, so the byte layouts differ even where the values match.

## The end-to-end suites

`Bind frame from JavaScript values` and `DataRow frames to JavaScript values` measure the native codec end to end:
JavaScript values in, a complete `Bind` frame out, and `DataRow` frames in, JavaScript values out.

The `Bind` suite runs `@effect/sql-pg` twice. `value sink` is `PgProtocol.makeBindEncoder(PgTypes.writeParameter)`,
which writes each value straight into the frame; it is what a client should use. `encoded parameters` is
`PgProtocol.encodeBind` over `PgTypes.encode` output, which allocates an array per parameter and copies it into the
frame. Both produce the same bytes.

`Bind frame from array parameters` is the same comparison for a row of two arrays, a 16-element `int4[]` and an
8-element `text[]`. Arrays are where writing values in place pays most, because the old path encoded every element
into an array of its own before copying all of them into the frame. Its rows are per parameter row, not per element,
so they are not comparable with the six-column suites.

## The component suites

The remaining suites split that work up, which is useful for finding hot spots but not for ranking the libraries:

- `type encode` and `type decode` compare the public codec paths for the shared scalar types.
- `int4[] decode` only measures `@effect/sql-pg`; `postgres.js` ships no array parser and leaves an array column as
  text.
- The two parser suites feed a block of 100 `DataRow` frames to the native parser, first as one buffer and then in
  64-byte chunks. `postgres.js` is absent from those tables because its protocol parser is private and fused to
  live connection and query state. Wrapping that state machine in a fake socket would measure client orchestration as
  well as parsing, so it would not be an equivalent offline parser benchmark. Its exported serializers and parsers are
  still included in the encode and decode tables.

Tinybench warms each task for 250 ms and measures it for one second. Results depend on the Node version, CPU, power
management, and other local load. Compare results from the same machine and runtime rather than treating one run as a
portable score.
