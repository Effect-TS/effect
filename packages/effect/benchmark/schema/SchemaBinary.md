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

| Case                   | SchemaBinary arena | SchemaBinary copy | Fingerprint |    JSON | Msgpack |
| ---------------------- | -----------------: | ----------------: | ----------: | ------: | ------: |
| small record           |            539,948 |           527,039 |     557,639 | 543,712 | 713,413 |
| nested payload         |            281,557 |           263,300 |     314,199 | 297,795 | 288,135 |
| collections            |             34,904 |            34,280 |      34,867 |  21,826 |  22,089 |
| index signatures / 128 |             14,248 |            14,032 |      14,212 |  35,879 |  34,577 |
| index signatures / 512 |              2,847 |             2,842 |       2,819 |   6,745 |   6,214 |
| large repeated records |              6,637 |             6,728 |       8,057 |   6,119 |   4,017 |

Decode rates:

| Case                   | SchemaBinary | Fingerprint |    JSON | Msgpack |
| ---------------------- | -----------: | ----------: | ------: | ------: |
| small record           |      542,953 |     556,595 | 490,785 | 700,895 |
| nested payload         |      267,487 |     297,120 | 240,479 | 273,777 |
| collections            |       38,767 |      38,893 |  20,624 |  21,856 |
| index signatures / 128 |       20,620 |      20,465 |  28,711 |  29,114 |
| index signatures / 512 |        5,003 |       4,935 |   5,371 |   4,511 |
| large repeated records |        7,293 |       8,053 |   5,681 |   4,751 |

The small cases are dominated by fixed per-call cost, so their arena and ownership-copy rows can trade places between runs. The larger cases are more stable; all throughput numbers remain machine-local rather than portable scores.

The per-frame repeated-record stream makes the framing cost concrete:

| Format                   | Frames | Raw bytes | gzip -6 | zstd |
| ------------------------ | -----: | --------: | ------: | ---: |
| SchemaBinary             |    200 |     27840 |    3109 | 3174 |
| SchemaBinary fingerprint |    200 |     21240 |    2876 | 2733 |
| Msgpack                  |    200 |     51520 |    2956 | 2888 |

Streaming decode rates in values per second:

| Case                      | Default single | Default batch | Default fragmented | Fingerprint single | Fingerprint batch | Fingerprint fragmented | Msgpack batch |
| ------------------------- | -------------: | ------------: | -----------------: | -----------------: | ----------------: | ---------------------: | ------------: |
| small record              |      2,517,093 |     4,181,458 |          2,143,016 |          2,927,704 |         5,271,645 |              2,784,487 |       894,047 |
| nested payload            |        714,015 |       798,220 |            679,913 |            854,066 |           964,312 |                831,851 |       264,625 |
| collections               |        116,068 |       117,284 |            116,753 |            115,983 |           117,092 |                115,291 |        21,121 |
| index signatures / 128    |         56,635 |        57,915 |             57,312 |             55,981 |            56,017 |                 55,782 |        27,894 |
| index signatures / 512    |          8,436 |         8,251 |              8,540 |              8,609 |             8,308 |                  8,533 |         4,055 |
| large repeated records    |         11,492 |        11,077 |             11,542 |             13,639 |            13,192 |                 13,558 |         6,433 |
| per-frame repeated record |      1,381,908 |     2,136,122 |          1,334,670 |          1,607,382 |         2,460,317 |              1,524,674 |       867,701 |

## Fingerprint mode

Fingerprint mode is measured against the optimized default mode in the same run, not against any earlier tree. Sizes are exact; rates are medians of three runs.

| Case                      | Raw bytes | Encode | Decode | Stream single | Stream batch | Stream fragmented |
| ------------------------- | --------: | -----: | -----: | ------------: | -----------: | ----------------: |
| small record              |    -39.7% |  +3.3% |  +2.5% |        +16.3% |       +26.1% |            +29.9% |
| nested payload            |    -35.2% | +11.6% | +11.1% |        +19.6% |       +20.8% |            +22.3% |
| collections               |     -1.0% |  -0.1% |  +0.3% |         -0.1% |        -0.2% |             -1.3% |
| index signatures / 128    |     +0.3% |  -0.3% |  -0.8% |         -1.2% |        -3.3% |             -2.7% |
| index signatures / 512    |     +0.1% |  -1.0% |  -1.4% |         +2.1% |        +0.7% |             -0.1% |
| large repeated records    |    -29.6% | +21.4% | +10.4% |        +18.7% |       +19.1% |            +17.5% |
| per-frame repeated record |    -23.7% |        |        |        +16.3% |       +15.2% |            +14.2% |

The size result splits by shape. Struct-heavy payloads drop the 5-byte field id and, for fixed-size leaves, the length byte too, which is where the 24% to 40% raw savings come from. Index-signature records carry almost no named fields, so they pay the 8-byte fingerprint and save nothing: those two cases get marginally larger. Collections sit in between.

Compression narrows the gap without erasing it. On the 200-frame stream, gzip goes from 3109 to 2876 bytes (-7.5%) and zstd from 3174 to 2733 (-13.9%), against -23.7% raw. Fingerprint mode is strongest on uncompressed transports, but the mismatch detection it adds is independent of compression.

The decode gain comes from dropping the field-id varint, sorted-field lookup, duplicate-id bookkeeping, and fixed-size leaf prefixes. The current tables compare the final implementations directly; obsolete intermediate optimization measurements have been removed.
