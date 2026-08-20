# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares `SchemaBinary`, JSON, and Effect's Msgpack schema codec with the same Schema values. It covers a small scalar-heavy record, a nested order payload, arrays and records, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

Treat the measurements as a per-machine comparison within one run. Runtime versions, CPU scaling, garbage collection, and the shape of each case can move the results, so rates from different machines or non-equivalent cases should not be ranked as one overall winner.
