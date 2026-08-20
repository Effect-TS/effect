# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares `SchemaBinary`, JSON, and Effect's Msgpack schema codec with the same Schema values. It covers a small scalar-heavy record, a nested order payload, arrays and records, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each one-shot encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

A second table compares stateful streaming decode. Each sample contains 32 concatenated frames. `SchemaBinary.parser(schema).feedSync` processes the binary stream; a reusable msgpackr `Unpackr.unpackMultiple` processes the Msgpack stream, then the same precompiled Schema decoder validates every value. Parser construction and stream encoding happen before timing. The streaming tasks get 25 warmup samples and 250 measured samples, and report throughput and median latency per decoded value.

This uses the core synchronous parsing work behind Effect's Msgpack stream decoder without Channel scheduling. JSON is omitted from the streaming table because its comparable Effect API is an NDJSON Channel, whose line framing and Channel runtime would measure a different layer. SchemaBinary has no streaming encoder in v1, so encode remains a one-shot comparison.

Treat the measurements as a per-machine comparison within one run. Runtime versions, CPU scaling, garbage collection, and the shape of each case can move the results, so rates from different machines or non-equivalent cases should not be ranked as one overall winner.

## Measured comparison

One run on Node 26.7.0, Linux x64. One-shot throughput is the average of 1,000 measured
samples per task; treat these as a within-run comparison, not a portable score.

| Case                   | Direction | SchemaBinary | Msgpack | SchemaBinary vs Msgpack |
| ---------------------- | --------- | -----------: | ------: | ----------------------: |
| small record           | encode    |      413,942 | 468,259 |                   0.88x |
| small record           | decode    |      472,582 | 474,553 |                   1.00x |
| nested payload         | encode    |      230,222 | 205,683 |                   1.12x |
| nested payload         | decode    |      227,531 | 199,069 |                   1.14x |
| collections            | encode    |       33,596 |  21,846 |                   1.54x |
| collections            | decode    |       37,822 |  21,604 |                   1.75x |
| large repeated records | encode    |        6,366 |   3,543 |                   1.80x |
| large repeated records | decode    |        6,248 |   4,156 |                   1.50x |

Both codecs run the same Schema parser, which costs roughly 140 us per
direction on the largest case and sets a floor neither format can go below.
The numbers above therefore understate the difference between the two
serialization layers.

The small-record row is the one case where msgpackr stays ahead. It returns a
view into a reused 8 KiB buffer rather than allocating per call, so it skips
the output copy that `SchemaBinary` pays on every encode. `SchemaBinary`
returns a freshly allocated `Uint8Array` that the caller owns outright, which
costs roughly 250 ns and dominates a 72-byte payload.

## Streaming decode comparison

Each sample decodes 32 concatenated frames with parser state reused between samples. Throughput is normalized to decoded values per second; latency is normalized to microseconds per value.

| Case                   | SchemaBinary parser | Msgpack unpackMultiple | SchemaBinary vs Msgpack |
| ---------------------- | ------------------: | ---------------------: | ----------------------: |
| small record           |             819,397 |                605,873 |                   1.35x |
| nested payload         |             264,288 |                194,432 |                   1.36x |
| collections            |              37,852 |                 20,760 |                   1.82x |
| large repeated records |               5,823 |                  4,910 |                   1.19x |

The stream-size table printed by the benchmark matters here. A persistent Msgpack `Packr` can reuse record definitions across frames, so its large repeated-record stream averages 19,484 bytes per frame versus 31,486 bytes for SchemaBinary in this run. The throughput comparison still favors SchemaBinary, but the two formats make different size-versus-parse-cost tradeoffs.
