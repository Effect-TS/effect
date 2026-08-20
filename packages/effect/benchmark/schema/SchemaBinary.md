# SchemaBinary codec benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

The benchmark compares arena-backed `SchemaBinary`, `SchemaBinary` followed by an ownership copy, `SchemaBinary` in fingerprint mode, JSON, and Effect's Msgpack schema codec with the same Schema values. The copy case calls `.slice()` on every arena result, reproducing the allocation that the arena removes. It covers a small scalar-heavy record, a nested order payload, collections, index-signature records below and above the parser's 256-entry cache bound, and 200 repeated records where framing and field-name overhead become visible.

Codec and schema construction happen before timing. Decode uses payloads encoded before timing. Each one-shot encode and decode task gets 100 warmup samples followed by 1,000 measured samples. The output includes UTF-8 payload sizes, average operations per second, median latency, relative margin of error, and sample count.

A second table compares stateful streaming decode with one frame per feed, 32 frames per feed, and each frame split immediately after its first byte. That fragment boundary exercises the incremental frame-header path instead of merely splitting the body. It also includes 200 distinct repeated-record frames, rather than one frame containing a 200-element array. `SchemaBinary.parser(schema).feedSync` processes the binary stream, once per wire mode; a reusable msgpackr `Unpackr.unpackMultiple` processes the Msgpack batch, then the same precompiled Schema decoder validates every value. Parser construction, stream encoding, and fragmentation happen before timing. The streaming tasks get 25 warmup samples and 250 measured samples, and report throughput and median latency per decoded value.

Size output includes raw, gzip level 6, and zstd bytes for each one-shot payload and concatenated stream. Compression is applied to the whole stream so repeated field ids can share the compressor dictionary.

This uses the core synchronous parsing work behind Effect's Msgpack stream decoder without Channel scheduling. JSON is omitted from the streaming table because its comparable Effect API is an NDJSON Channel, whose line framing and Channel runtime would measure a different layer. SchemaBinary has no streaming encoder in v1, so encode remains a one-shot comparison.

Treat the measurements as a per-machine comparison within one run. Runtime versions, CPU scaling, garbage collection, and the shape of each case can move the results, so rates from different machines or non-equivalent cases should not be ranked as one overall winner.

## Measured comparison

These measurements used Node 26.7.0 on Linux x64. Payload sizes are exact; throughput is the median of three full runs and is machine-local.

| Case                   | SchemaBinary raw/gzip/zstd | Fingerprint raw/gzip/zstd |  JSON raw/gzip/zstd | Msgpack raw/gzip/zstd |
| ---------------------- | -------------------------: | ------------------------: | ------------------: | --------------------: |
| small record           |               58 / 78 / 67 |              35 / 53 / 44 |       89 / 100 / 92 |          69 / 88 / 78 |
| nested payload         |            318 / 305 / 300 |           206 / 209 / 203 |     453 / 303 / 309 |       385 / 304 / 299 |
| collections            |           1452 / 792 / 776 |          1438 / 776 / 758 |    1828 / 671 / 660 |      1462 / 788 / 805 |
| index signatures / 128 |           2251 / 689 / 656 |          2258 / 697 / 665 |    2235 / 573 / 559 |      2203 / 676 / 629 |
| index signatures / 512 |         9355 / 2373 / 2189 |        9362 / 2383 / 2197 |  9531 / 2266 / 2074 |    9287 / 2544 / 2304 |
| large repeated records |        27646 / 3065 / 3175 |       19454 / 2766 / 2701 | 57529 / 3230 / 3008 |   51283 / 3516 / 3320 |

Compression narrows or reverses the raw-size advantage on several cases. Repeated field ids compress well, so raw transport size and compressed transport size should be treated as separate results.

Encode rates in operations per second:

| Case                   | SchemaBinary arena | SchemaBinary copy | Fingerprint | Msgpack |
| ---------------------- | -----------------: | ----------------: | ----------: | ------: |
| small record           |            501,284 |           488,131 |     517,385 | 480,915 |
| nested payload         |            233,724 |           220,297 |     249,978 | 207,419 |
| collections            |             34,342 |            33,780 |      34,180 |  21,994 |
| index signatures / 128 |             14,096 |            14,048 |      14,214 |  34,134 |
| index signatures / 512 |              2,830 |             2,852 |       2,864 |   6,218 |
| large repeated records |              5,908 |             5,719 |       6,688 |   3,445 |

Decode rates:

| Case                   | SchemaBinary | Fingerprint | Msgpack |
| ---------------------- | -----------: | ----------: | ------: |
| small record           |      507,538 |     518,477 | 494,179 |
| nested payload         |      225,371 |     242,223 | 201,306 |
| collections            |       38,060 |      37,874 |  21,327 |
| index signatures / 128 |       20,750 |      20,387 |  29,064 |
| index signatures / 512 |        5,031 |       4,943 |   4,511 |
| large repeated records |        6,089 |       6,638 |   3,972 |

The small cases are dominated by fixed per-call cost, so their arena and ownership-copy rows can trade places between runs. The larger cases are more stable; all throughput numbers remain machine-local rather than portable scores.

The per-frame repeated-record stream makes the framing cost concrete:

| Format                   | Frames | Raw bytes | gzip -6 | zstd |
| ------------------------ | -----: | --------: | ------: | ---: |
| SchemaBinary             |    200 |     27840 |    3109 | 3174 |
| SchemaBinary fingerprint |    200 |     21240 |    2876 | 2733 |
| Msgpack                  |    200 |     51520 |    2956 | 2888 |

## Fingerprint mode

Fingerprint mode is measured against the optimized default mode in the same run, not against any earlier tree. Sizes are exact; rates are medians of three runs.

| Case                      | Raw bytes | Encode | Decode | Stream single | Stream batch | Stream fragmented |
| ------------------------- | --------: | -----: | -----: | ------------: | -----------: | ----------------: |
| small record              |    -39.7% |  +3.2% |  +2.2% |         +4.9% |        +7.0% |            +14.7% |
| nested payload            |    -35.2% |  +7.0% |  +7.5% |        +11.4% |        +6.7% |             +6.3% |
| collections               |     -1.0% |  -0.5% |  -0.5% |         +1.4% |        -0.3% |             -0.5% |
| index signatures / 128    |     +0.3% |  +0.8% |  -1.7% |         +0.8% |        +0.5% |             +1.0% |
| index signatures / 512    |     +0.1% |  +1.2% |  -1.7% |         +2.7% |        -1.4% |             -0.9% |
| large repeated records    |    -29.6% | +13.2% |  +9.0% |        +10.2% |       +10.9% |             +9.7% |
| per-frame repeated record |    -23.7% |        |        |         +8.1% |        +5.3% |             +2.2% |

The size result splits by shape. Struct-heavy payloads drop the 5-byte field id and, for fixed-size leaves, the length byte too, which is where the 24% to 40% raw savings come from. Index-signature records carry almost no named fields, so they pay the 8-byte fingerprint and save nothing: those two cases get marginally larger. Collections sit in between.

Compression narrows the gap without erasing it. On the 200-frame stream, gzip goes from 3109 to 2876 bytes (-7.5%) and zstd from 3174 to 2733 (-13.9%), against -23.7% raw. Fingerprint mode is strongest on uncompressed transports, but the mismatch detection it adds is independent of compression.

The decode gain comes from dropping the field-id varint, the sorted-field cursor and map fallback, the duplicate-id bookkeeping, and the per-field length prefix on fixed-size leaves. It is reported here as a measurement against the optimized parser. The pre-optimization estimate that field varints were 24% of decode time predates the unrolled reader and is not a forecast for this change.

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

The collections result matches the original roughly 20% target. The 128-key case benefits more because the parser reuses every classification on later frames. The 512-key case verifies that inputs wider than the cache bound still improve rather than thrash: the cache retains roughly half of the classifications and admits at most one replacement per frame. Those targets were diagnostic estimates, not acceptance thresholds.
