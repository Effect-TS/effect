# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares arena-backed `SchemaBinary`, `SchemaBinary` followed by an ownership copy, JSON, and Effect's Msgpack schema codec with the same Schema values. The copy case calls `.slice()` on every arena result, reproducing the allocation that the arena removes. It covers a small scalar-heavy record, a nested order payload, arrays and records, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each one-shot encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

A second table compares stateful streaming decode. Each sample contains 32 concatenated frames. `SchemaBinary.parser(schema).feedSync` processes the binary stream; a reusable msgpackr `Unpackr.unpackMultiple` processes the Msgpack stream, then the same precompiled Schema decoder validates every value. Parser construction and stream encoding happen before timing. The streaming tasks get 25 warmup samples and 250 measured samples, and report throughput and median latency per decoded value.

This uses the core synchronous parsing work behind Effect's Msgpack stream decoder without Channel scheduling. JSON is omitted from the streaming table because its comparable Effect API is an NDJSON Channel, whose line framing and Channel runtime would measure a different layer. SchemaBinary has no streaming encoder in v1, so encode remains a one-shot comparison.

Treat the measurements as a per-machine comparison within one run. Runtime versions, CPU scaling, garbage collection, and the shape of each case can move the results, so rates from different machines or non-equivalent cases should not be ranked as one overall winner.

## Measured comparison

One run on Node 26.7.0, Linux x64, on the wire format that encodes integral
numbers as varints. One-shot throughput is the average of 1,000 measured
samples per task; treat these as a within-run comparison, not a portable score.

Payload sizes are exact and portable, so they are the part of this table worth
comparing across machines.

| Case                   | SchemaBinary |  JSON | Msgpack | SchemaBinary vs Msgpack |
| ---------------------- | -----------: | ----: | ------: | ----------------------: |
| small record           |           58 |    89 |      69 |           1.19x smaller |
| nested payload         |          318 |   453 |     385 |           1.21x smaller |
| collections            |         1452 |  1828 |    1462 |           1.01x smaller |
| large repeated records |        27646 | 57529 |   51283 |           1.85x smaller |

Encoding integral numbers as varints took these payloads from 72, 347, 2553 and
31486 bytes. The collections case stays close to Msgpack because it is
dominated by genuinely non-integral floats, which stay in the eight-byte f64
form.

The encode rows exercise both ownership models on every case. Decode does not depend on output ownership, so the arena rows below are compared with Msgpack.

| Case                   | SchemaBinary arena | SchemaBinary copy | Arena vs copy | Msgpack |
| ---------------------- | -----------------: | ----------------: | ------------: | ------: |
| small record           |            462,101 |           488,902 |         0.95x | 480,796 |
| nested payload         |            237,505 |           223,273 |         1.06x | 210,144 |
| collections            |             34,139 |            33,853 |         1.01x |  22,929 |
| large repeated records |              6,001 |             5,932 |         1.01x |   3,461 |

| Case                   | SchemaBinary decode | Msgpack decode | SchemaBinary vs Msgpack |
| ---------------------- | ------------------: | -------------: | ----------------------: |
| small record           |             489,273 |        483,113 |                   1.01x |
| nested payload         |             231,041 |        203,513 |                   1.14x |
| collections            |              38,306 |         22,508 |                   1.70x |
| large repeated records |               6,142 |          4,116 |                   1.49x |

Both codecs run the same Schema parser, which costs roughly 140 us per
direction on the largest case and sets a floor neither format can go below.
The numbers above therefore understate the difference between the two
serialization layers.

The small record is now the noisiest case rather than the slowest one: at 58
bytes both encode paths are dominated by fixed per-call cost, the arena row
carried a 6.9% relative margin of error in this run, and arena and copy trade
places between runs. The other three cases put the arena 1-6% ahead of the
ownership-copy control. Results returned by the arena keep an exact byte range
but can share a larger backing buffer, as documented by
`SchemaBinary.toCodec`.

## Streaming decode comparison

Each sample decodes 32 concatenated frames with parser state reused between samples. Throughput is normalized to decoded values per second; latency is normalized to microseconds per value.

| Case                   | SchemaBinary parser | Msgpack unpackMultiple | SchemaBinary vs Msgpack |
| ---------------------- | ------------------: | ---------------------: | ----------------------: |
| small record           |             820,916 |                626,090 |                   1.31x |
| nested payload         |             260,545 |                196,463 |                   1.33x |
| collections            |              37,921 |                 21,565 |                   1.76x |
| large repeated records |               5,725 |                  5,038 |                   1.14x |

The stream-size table printed by the benchmark matters here. A persistent Msgpack `Packr` can reuse record definitions across frames, so its large repeated-record stream averages 19,484 bytes per frame versus 27,646 bytes for SchemaBinary in this run. The throughput comparison still favors SchemaBinary, but the two formats make different size-versus-parse-cost tradeoffs.
