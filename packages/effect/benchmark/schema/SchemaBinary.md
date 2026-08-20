# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares arena-backed `SchemaBinary`, `SchemaBinary` followed by an ownership copy, JSON, and Effect's Msgpack schema codec with the same Schema values. The copy case calls `.slice()` on every arena result, reproducing the allocation that the arena removes. It covers a small scalar-heavy record, a nested order payload, collections, an index-signature-heavy record, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each one-shot encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

A second table compares stateful streaming decode with one frame per feed, 32 frames per feed, and each frame split into two precomputed chunks. It also includes 200 distinct repeated-record frames, rather than one frame containing a 200-element array. `SchemaBinary.parser(schema).feedSync` processes the binary stream; a reusable msgpackr `Unpackr.unpackMultiple` processes the Msgpack batch, then the same precompiled Schema decoder validates every value. Parser construction, stream encoding, and fragmentation happen before timing. The streaming tasks get 25 warmup samples and 250 measured samples, and report throughput and median latency per decoded value.

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
| index-signature-heavy  |           2251 / 689 / 656 |    2235 / 573 / 559 |      2203 / 676 / 629 |
| large repeated records |        27646 / 3065 / 3175 | 57529 / 3230 / 3008 |   51283 / 3516 / 3320 |

Compression narrows or reverses the raw-size advantage on several cases. Repeated field ids compress well, so raw transport size and compressed transport size should be treated as separate results.

The per-frame repeated-record stream makes that distinction concrete:

| Format       | Frames | Raw bytes | gzip -6 | zstd |
| ------------ | -----: | --------: | ------: | ---: |
| SchemaBinary |    200 |     27840 |    3109 | 3174 |
| Msgpack      |    200 |     51520 |    2956 | 2888 |

## Parser optimization effects

The initial investigation measured each change before they were stacked. Values below are medians of three interleaved runs on commit `265c3b0a19`; rates are decoded values per second.

| Variant                                      | Small batch 32 | Small single | Small fragmented | Nested batch 32 | Collections batch 32 |
| -------------------------------------------- | -------------: | -----------: | ---------------: | --------------: | -------------------: |
| Baseline                                     |           829k |         894k |             808k |            261k |                38.9k |
| Reader/DataView reuse                        |           869k |         990k |             868k |            272k |                38.9k |
| Reader reuse plus persistent signature cache |           932k |        1038k |             947k |            283k |                46.6k |

The number-based header path was isolated separately: +9.5% small batch, +1.4% small single, +7.2% small fragmented, and +4.5% nested batch. These percentages are not added to the Reader and cache results.

The final combined implementation was then compared with the pre-refactor `8e60b33c2` head using the same extended benchmark on both trees. The table reports medians of three full runs. Single-frame tasks have visibly higher fixed-cost noise than batch and fragmented tasks.

| Case                      | Feed       | Baseline | Combined | Change |
| ------------------------- | ---------- | -------: | -------: | -----: |
| small record              | single     |     720k |     788k |  +9.4% |
| small record              | batch 32   |     828k |     939k | +13.5% |
| small record              | fragmented |     666k |     754k | +13.1% |
| nested payload            | single     |     232k |     243k |  +5.0% |
| nested payload            | batch 32   |     260k |     271k |  +4.1% |
| nested payload            | fragmented |     243k |     260k |  +6.7% |
| collections               | single     |    36.5k |    43.4k | +18.9% |
| collections               | batch 32   |    38.2k |    46.0k | +20.6% |
| collections               | fragmented |    38.4k |    46.5k | +21.2% |
| index-signature-heavy     | single     |    20.3k |    39.0k | +91.8% |
| index-signature-heavy     | batch 32   |    20.6k |    39.2k | +90.4% |
| index-signature-heavy     | fragmented |    20.8k |    38.8k | +86.6% |
| per-frame repeated record | single     |     603k |     642k |  +6.5% |
| per-frame repeated record | batch 200  |     653k |     712k |  +8.9% |
| per-frame repeated record | fragmented |     580k |     635k |  +9.4% |

The collections result matches the original roughly 20% target. The dedicated 128-key case benefits more because the parser reuses every classification on later frames. Small records land around 9-13%; nested payloads land around 4-7%. Those targets were diagnostic estimates, not acceptance thresholds.
