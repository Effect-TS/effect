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

One run on Node 26.7.0, Linux x64. One-shot throughput is the average of 1,000 measured
samples per task; treat these as a within-run comparison, not a portable score.

The encode rows exercise both ownership models on every case. Decode does not depend on output ownership, so the arena rows below are compared with Msgpack.

| Case                   | SchemaBinary arena | SchemaBinary copy | Arena vs copy | Msgpack |
| ---------------------- | -----------------: | ----------------: | ------------: | ------: |
| small record           |            462,238 |           444,428 |         1.04x | 470,631 |
| nested payload         |            235,971 |           223,358 |         1.06x | 209,940 |
| collections            |             34,632 |            34,224 |         1.01x |  22,340 |
| large repeated records |              6,196 |             6,094 |         1.02x |   3,514 |

| Case                   | SchemaBinary decode | Msgpack decode | SchemaBinary vs Msgpack |
| ---------------------- | ------------------: | -------------: | ----------------------: |
| small record           |             485,041 |        471,327 |                   1.03x |
| nested payload         |             223,300 |        203,587 |                   1.10x |
| collections            |              37,881 |         21,442 |                   1.77x |
| large repeated records |               6,129 |          4,066 |                   1.51x |

Both codecs run the same Schema parser, which costs roughly 140 us per
direction on the largest case and sets a floor neither format can go below.
The numbers above therefore understate the difference between the two
serialization layers.

Removing the output copy matters most for the 72-byte small record, where the
arena was 4% faster than the ownership-copy control and nearly closed the gap
with msgpackr. The other three cases were 1-6% faster than the copy control;
none showed a material regression. Results returned by the arena keep an exact
byte range but can share a larger backing buffer, as documented by
`SchemaBinary.toCodec`.

## Streaming decode comparison

Each sample decodes 32 concatenated frames with parser state reused between samples. Throughput is normalized to decoded values per second; latency is normalized to microseconds per value.

| Case                   | SchemaBinary parser | Msgpack unpackMultiple | SchemaBinary vs Msgpack |
| ---------------------- | ------------------: | ---------------------: | ----------------------: |
| small record           |             819,397 |                605,873 |                   1.35x |
| nested payload         |             264,288 |                194,432 |                   1.36x |
| collections            |              37,852 |                 20,760 |                   1.82x |
| large repeated records |               5,823 |                  4,910 |                   1.19x |

The stream-size table printed by the benchmark matters here. A persistent Msgpack `Packr` can reuse record definitions across frames, so its large repeated-record stream averages 19,484 bytes per frame versus 31,486 bytes for SchemaBinary in this run. The throughput comparison still favors SchemaBinary, but the two formats make different size-versus-parse-cost tradeoffs.
