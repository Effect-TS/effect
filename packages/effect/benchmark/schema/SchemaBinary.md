# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run with the RPC serialization performance changes on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

The default mode writes an array of structs as a row run: each distinct set of present fields declares its field ids once, and later rows reference that shape and any string already written in the same slot. Fingerprint mode instead omits field identifiers entirely when the schema fingerprint matches. JSON, Msgpack, and NDJSON use the same `Schema.toCodecJson` representation.

Protobuf uses `protobufjs` reflection types parsed once before timing. `Schema.Number` maps to proto3 `double`, records map to `map<string, double>`, and top-level arrays and records use wrapper messages. Tuple samples and nested arrays use messages because protobuf does not support either shape directly. The benchmark measures hot `Type.encode`, `Type.decode`, and `decodeDelimited` calls; descriptor construction and the case adapters used by round-trip assertions are excluded.

The streaming setup compares the closest public decode paths. SchemaBinary reuses one synchronous parser for each feed shape. Msgpack synchronously calls `unpackMultiple` on the batch, then validates each value. NDJSON runs `Ndjson.decodeSchema` through Effect Stream and Channel for every operation, including UTF-8 decoding, line splitting, `JSON.parse`, schema validation, and runtime scheduling. A batch is one Channel run over 32 lines, or 200 lines for the per-frame case. Single and fragmented measurements each run a complete Channel for one line, so their scheduling cost is not amortized. This makes batch the closest throughput comparison while preserving the cost of each public API.

SchemaBinary uses length-prefixed frames, NDJSON includes one newline byte per frame, and Msgpack concatenates self-delimiting values. Fragmented inputs split after the first byte. Stream compression is applied to the complete concatenated stream.

The `200-row array payload` case uses `Schema.Array(LargeRow)`, so one value is an array containing 200 rows. A one-shot operation encodes or decodes that entire array. Its streaming batch contains 32 frames with the same 200-row array, or 6,400 row occurrences in total. The `200 single-row frames` case uses `LargeRow` directly and sends the 200 distinct rows as 200 frames. Streaming throughput is decoded values per second: arrays per second for the first case and rows per second for the second. Multiply the array rate by 200 to compare decoded row throughput.

## Payload size

Cells contain raw / gzip -6 / zstd bytes.

| Case                   |       SchemaBinary |         Fingerprint |                JSON |             Msgpack |            Protobuf |
| ---------------------- | -----------------: | ------------------: | ------------------: | ------------------: | ------------------: |
| small record           |       58 / 78 / 67 |        35 / 53 / 44 |       89 / 100 / 92 |        69 / 88 / 78 |        42 / 51 / 44 |
| nested payload         |    291 / 301 / 294 |     206 / 209 / 203 |     453 / 303 / 309 |     385 / 304 / 299 |     241 / 220 / 214 |
| collections            |   1452 / 792 / 776 |    1438 / 776 / 758 |    1828 / 671 / 660 |    1462 / 788 / 805 |    2932 / 799 / 754 |
| index signatures / 128 |   2251 / 689 / 656 |    2258 / 697 / 665 |    2235 / 573 / 559 |    2203 / 676 / 629 |    2834 / 586 / 476 |
| index signatures / 512 | 9355 / 2373 / 2189 |  9362 / 2383 / 2197 |  9531 / 2266 / 2074 |  9287 / 2544 / 2304 | 11666 / 1978 / 1737 |
| 200-row array payload  | 7771 / 2441 / 2224 | 19454 / 2766 / 2701 | 57529 / 3230 / 3008 | 51283 / 3516 / 3320 | 24480 / 3111 / 2839 |

Streaming cells contain total raw / gzip -6 / zstd bytes for the complete stream.

| Case                   | Frames |         SchemaBinary |           Fingerprint |               Msgpack |              Protobuf |                 NDJSON |
| ---------------------- | -----: | -------------------: | --------------------: | --------------------: | --------------------: | ---------------------: |
| small record           |     32 |       1856 / 95 / 75 |        1120 / 65 / 51 |       2240 / 111 / 87 |        1376 / 66 / 51 |        2880 / 123 / 98 |
| nested payload         |     32 |     9312 / 381 / 299 |      6592 / 259 / 208 |     10880 / 369 / 306 |      7776 / 271 / 220 |      14528 / 399 / 315 |
| collections            |     32 |   46464 / 1122 / 793 |    46016 / 1102 / 776 |    47424 / 1130 / 813 |    93888 / 2074 / 774 |     58528 / 1079 / 676 |
| index signatures / 128 |     32 |   72032 / 1229 / 669 |    72256 / 1270 / 678 |    71008 / 1252 / 649 |    90752 / 1503 / 492 |     71552 / 1073 / 540 |
| index signatures / 512 |     32 | 299360 / 5528 / 2227 |  299584 / 5528 / 2235 |  297696 / 5775 / 2037 |  373376 / 5956 / 1782 |   305024 / 5831 / 1829 |
| 200-row array payload  |     32 | 248672 / 4597 / 2261 | 622528 / 12524 / 2765 | 623488 / 12335 / 2736 | 783456 / 12374 / 2909 | 1840960 / 87481 / 3226 |
| 200 single-row frames  |    200 |  27840 / 3109 / 3174 |   21240 / 2876 / 2733 |   51520 / 2956 / 2888 |   24280 / 3104 / 2788 |    57528 / 3230 / 3019 |

## One-shot throughput

Average encode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | --------: | ----------: | ------: | ------: | --------: |
| small record           | 1,015,853 |   1,090,723 | 455,916 | 718,290 | 1,996,939 |
| nested payload         |   353,913 |     406,280 | 267,143 | 286,281 |   580,900 |
| collections            |    53,251 |      54,962 |  21,343 |  21,662 |    76,677 |
| index signatures / 128 |    47,396 |      47,784 |  35,595 |  34,706 |    63,351 |
| index signatures / 512 |     8,935 |       8,861 |   6,808 |   6,169 |    15,871 |
| 200-row array payload  |     9,524 |       8,674 |   6,837 |   4,069 |    11,589 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | --------: | ----------: | ------: | ------: | --------: |
| small record           | 1,172,470 |   1,251,830 | 413,817 | 718,504 | 4,868,245 |
| nested payload         |   522,130 |     623,535 | 219,596 | 270,915 |   846,693 |
| collections            |   116,453 |     119,257 |  20,558 |  21,603 |   109,044 |
| index signatures / 128 |    63,408 |      63,971 |  28,115 |  29,110 |    61,705 |
| index signatures / 512 |    16,908 |      16,949 |   5,359 |   4,575 |    10,236 |
| 200-row array payload  |    23,604 |      14,923 |   5,614 |   4,730 |    18,939 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  Protobuf |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | --------: | ------: |
| small record           | 4,602,707 |   5,557,207 | 897,376 | 6,130,228 | 837,734 |
| nested payload         |   857,531 |   1,119,557 | 284,291 |   744,364 | 310,274 |
| collections            |   127,187 |     128,327 |  21,183 |   103,600 |  20,413 |
| index signatures / 128 |    66,022 |      66,939 |  27,415 |    45,535 |  28,629 |
| index signatures / 512 |    16,664 |      16,674 |   4,082 |     7,217 |   5,074 |
| 200-row array payload  |    23,661 |      14,737 |   6,379 |     8,254 |   4,890 |
| 200 single-row frames  | 2,477,492 |   2,797,595 | 858,284 | 1,907,908 | 959,916 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,276,637 |          1,974,925 |          2,634,448 |              2,693,612 |       139,375 |           146,175 |
| nested payload         |        692,719 |            713,525 |            888,263 |                908,142 |       110,809 |           110,291 |
| collections            |        124,388 |            123,815 |            123,671 |                124,928 |        18,662 |            18,686 |
| index signatures / 128 |         65,086 |             65,586 |             65,839 |                 66,201 |        24,772 |            24,546 |
| index signatures / 512 |         16,635 |             16,870 |             16,951 |                 16,634 |         5,167 |             5,209 |
| 200-row array payload  |         23,933 |             23,611 |             14,888 |                 14,654 |         5,255 |             5,191 |
| 200 single-row frames  |      1,528,331 |          1,390,970 |          1,771,048 |              1,297,010 |       132,075 |           132,130 |

## Analysis

- Protobuf has the fastest one-shot encode rate in every case and the fastest decode rate for the two record-shaped cases. SchemaBinary decodes collections, large maps, and repeated rows faster while also returning schema-validated application values; Protobuf returns reflection message objects in the timed path.
- SchemaBinary is faster than Msgpack and NDJSON streaming in every batch case. Protobuf wins the small-record batch; SchemaBinary leads the other six shapes.
- The smaller SchemaBinary mode beats Protobuf's raw size in every case. Compression changes the ranking for maps: Protobuf has the smallest compressed output for both index-signature cases.
- Row runs make the default mode the smallest and fastest SchemaBinary format for repeated rows: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted, 24,480 for Protobuf, and 51,283 for Msgpack. They cost a little on short arrays, where the per-row shape code is not yet amortized: `nested payload` holds three line items and encodes roughly 9% slower than before runs, for 8% fewer bytes.
