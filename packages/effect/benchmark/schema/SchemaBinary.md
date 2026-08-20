# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares `SchemaBinary`, JSON, and Effect's Msgpack schema codec with the same Schema values. It covers a small scalar-heavy record, a nested order payload, arrays and records, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

Treat the measurements as a per-machine comparison within one run. Runtime versions, CPU scaling, garbage collection, and the shape of each case can move the results, so rates from different machines or non-equivalent cases should not be ranked as one overall winner.

## Measured comparison

One run on Node 24, Linux x64. Throughput is the average of 1,000 measured
samples per task; treat these as a within-run comparison, not a portable score.

| Case                   | Direction | SchemaBinary | Msgpack | SchemaBinary vs Msgpack |
| ---------------------- | --------- | -----------: | ------: | ----------------------: |
| small record           | encode    |      423,321 | 472,497 |                   0.90x |
| small record           | decode    |      463,684 | 487,661 |                   0.95x |
| nested payload         | encode    |      238,405 | 214,810 |                   1.11x |
| nested payload         | decode    |      234,379 | 205,789 |                   1.14x |
| collections            | encode    |       33,765 |  23,010 |                   1.47x |
| collections            | decode    |       37,854 |  22,586 |                   1.68x |
| large repeated records | encode    |        6,749 |   3,739 |                   1.81x |
| large repeated records | decode    |        6,257 |   4,138 |                   1.51x |

Both codecs run the same Schema parser, which costs roughly 140 us per
direction on the largest case and sets a floor neither format can go below.
The numbers above therefore understate the difference between the two
serialization layers: on the largest case that layer is about 85 us to encode
and 69 us to decode for `SchemaBinary`, against about 102 us and 83 us for
msgpackr.

The small-record row is the one case where msgpackr stays ahead. It returns a
view into a reused 8 KiB buffer rather than allocating per call, so it skips
the output copy that `SchemaBinary` pays on every encode. `SchemaBinary`
returns a freshly allocated `Uint8Array` that the caller owns outright, which
costs roughly 250 ns and dominates a 72-byte payload.
