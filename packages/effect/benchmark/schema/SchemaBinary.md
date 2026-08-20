# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares arena-backed `SchemaBinary`, `SchemaBinary` followed by an ownership copy, JSON, and Effect's Msgpack schema codec with the same Schema values. The copy case calls `.slice()` on every arena result, reproducing the allocation that the arena removes. It covers a small scalar-heavy record, a nested order payload, collections, index-signature records below and above the parser's 256-entry cache bound, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each one-shot encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

A second table compares stateful streaming decode with one frame per feed, 32 frames per feed, and each frame split immediately after its first byte. That fragment boundary exercises the incremental frame-header path instead of merely splitting the body. It also includes 200 distinct repeated-record frames, rather than one frame containing a 200-element array. `SchemaBinary.parser(schema).feedSync` processes the binary stream; a reusable msgpackr `Unpackr.unpackMultiple` processes the Msgpack batch, then the same precompiled Schema decoder validates every value. Parser construction, stream encoding, and fragmentation happen before timing. The streaming tasks get 25 warmup samples and 250 measured samples, and report throughput and median latency per decoded value.

Size output includes raw, gzip level 6, and zstd bytes for each one-shot payload and concatenated stream. Compression is applied to the whole stream so repeated field ids can share the compressor dictionary.

This uses the core synchronous parsing work behind Effect's Msgpack stream decoder without Channel scheduling. JSON is omitted from the streaming table because its comparable Effect API is an NDJSON Channel, whose line framing and Channel runtime would measure a different layer. SchemaBinary has no streaming encoder in v1, so encode remains a one-shot comparison.

Treat the measurements as a per-machine comparison within one run. Runtime versions, CPU scaling, garbage collection, and the shape of each case can move the results, so rates from different machines or non-equivalent cases should not be ranked as one overall winner.

## Measured comparison

These measurements used Node 26.7.0 on Linux x64. Payload sizes are exact; throughput is machine-local.

| Case                   | SchemaBinary raw/gzip/zstd |  JSON raw/gzip/zstd | Msgpack raw/gzip/zstd |
| ---------------------- | -------------------------: | ------------------: | --------------------: |
| small record           |               58 / 78 / 67 |       89 / 100 / 92 |          69 / 88 / 78 |
| nested payload         |            318 / 305 / 300 |     453 / 303 / 309 |       385 / 304 / 299 |
| collections            |           1452 / 792 / 776 |    1828 / 671 / 660 |      1462 / 788 / 805 |
| index signatures / 128 |           2251 / 689 / 656 |    2235 / 573 / 559 |      2203 / 676 / 629 |
| index signatures / 512 |         9355 / 2373 / 2189 |  9531 / 2266 / 2074 |    9287 / 2544 / 2304 |
| large repeated records |        27646 / 3065 / 3175 | 57529 / 3230 / 3008 |   51283 / 3516 / 3320 |

Compression narrows or reverses the raw-size advantage on several cases. Repeated field ids compress well, so raw transport size and compressed transport size should be treated as separate results.

One representative run of the combined tree produced the following one-shot encode rates in operations per second:

| Case                   | SchemaBinary arena | SchemaBinary copy | Msgpack |
| ---------------------- | -----------------: | ----------------: | ------: |
| small record           |            491,619 |           500,578 | 488,432 |
| nested payload         |            232,943 |           220,297 | 208,758 |
| collections            |             34,078 |            33,545 |  21,706 |
| index signatures / 128 |             14,286 |            14,191 |  33,791 |
| index signatures / 512 |              2,883 |             2,887 |   6,333 |
| large repeated records |              6,156 |             6,086 |   3,521 |

The corresponding one-shot decode rates were:

| Case                   | SchemaBinary | Msgpack |
| ---------------------- | -----------: | ------: |
| small record           |      496,806 | 470,364 |
| nested payload         |      221,214 | 201,178 |
| collections            |       37,080 |  21,081 |
| index signatures / 128 |       20,494 |  29,208 |
| index signatures / 512 |        4,979 |   4,456 |
| large repeated records |        5,876 |   4,000 |

The small cases are dominated by fixed per-call cost, so their arena and ownership-copy rows can trade places between runs. The larger cases are more stable; all throughput numbers remain machine-local rather than portable scores.

The per-frame repeated-record stream makes that distinction concrete:

| Format       | Frames | Raw bytes | gzip -6 | zstd |
| ------------ | -----: | --------: | ------: | ---: |
| SchemaBinary |    200 |     27840 |    3109 | 3174 |
| Msgpack      |    200 |     51520 |    2956 | 2888 |

## Parser optimization effects

The initial investigation measured each change before they were stacked. Values below are medians of three interleaved runs on commit `265c3b0a19`; rates are decoded values per second. This isolated-change baseline is intentionally different from the later end-to-end comparison against `8e60b33c2`.

| Variant                                      | Small batch 32 | Small single | Small fragmented | Nested batch 32 | Collections batch 32 |
| -------------------------------------------- | -------------: | -----------: | ---------------: | --------------: | -------------------: |
| Baseline                                     |           829k |         894k |             808k |            261k |                38.9k |
| Reader/DataView reuse                        |           869k |         990k |             868k |            272k |                38.9k |
| Reader reuse plus persistent signature cache |           932k |        1038k |             947k |            283k |                46.6k |

The number-based header path was isolated separately: +9.5% small batch, +1.4% small single, +7.2% small fragmented, and +4.5% nested batch. These percentages are not added to the Reader and cache results.

The final combined implementation was then compared with the pre-refactor `8e60b33c2` head using the same extended benchmark on both trees. The table reports medians of three full runs. Single-frame tasks have visibly higher fixed-cost noise than batch and fragmented tasks.

| Case                      | Feed       | Baseline | Combined | Change |
| ------------------------- | ---------- | -------: | -------: | -----: |
| small record              | single     |     726k |     809k | +11.5% |
| small record              | batch 32   |     799k |     949k | +18.8% |
| small record              | fragmented |     651k |     770k | +18.3% |
| nested payload            | single     |     224k |     235k |  +5.0% |
| nested payload            | batch 32   |     250k |     269k |  +7.5% |
| nested payload            | fragmented |     235k |     254k |  +7.7% |
| collections               | single     |    36.1k |    43.1k | +19.2% |
| collections               | batch 32   |    37.0k |    46.0k | +24.3% |
| collections               | fragmented |    37.5k |    46.3k | +23.4% |
| index signatures / 128    | single     |    20.8k |    39.5k | +90.1% |
| index signatures / 128    | batch 32   |    20.8k |    39.4k | +89.7% |
| index signatures / 128    | fragmented |    20.9k |    40.3k | +92.6% |
| index signatures / 512    | single     |     4.9k |     6.5k | +32.0% |
| index signatures / 512    | batch 32   |     4.6k |     6.5k | +42.2% |
| index signatures / 512    | fragmented |     4.9k |     6.9k | +39.5% |
| per-frame repeated record | single     |     581k |     649k | +11.8% |
| per-frame repeated record | batch 200  |     647k |     710k |  +9.6% |
| per-frame repeated record | fragmented |     578k |     634k |  +9.8% |

The collections result matches the original roughly 20% target. The 128-key case benefits more because the parser reuses every classification on later frames. The 512-key case verifies that inputs wider than the cache bound still improve rather than thrash: the cache retains most classifications and admits at most one replacement per frame. Those targets were diagnostic estimates, not acceptance thresholds.
