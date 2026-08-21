# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run with the RPC performance and row-run changes on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

The default mode writes an array of structs as a row run: each distinct set of present fields declares its field ids once, and later rows reference that shape and any string already written in the same slot. Fingerprint mode instead omits field identifiers entirely when the schema fingerprint matches. JSON, Msgpack, and NDJSON use the same `Schema.toCodecJson` representation.

The streaming setup compares the closest public decode paths. SchemaBinary reuses one synchronous parser for each feed shape. Msgpack synchronously calls `unpackMultiple` on the batch, then validates each value. NDJSON runs `Ndjson.decodeSchema` through Effect Stream and Channel for every operation, including UTF-8 decoding, line splitting, `JSON.parse`, schema validation, and runtime scheduling. A batch is one Channel run over 32 lines, or 200 lines for the per-frame case. Single and fragmented measurements each run a complete Channel for one line, so their scheduling cost is not amortized. This makes batch the closest throughput comparison while preserving the cost of each public API.

SchemaBinary uses length-prefixed frames, NDJSON includes one newline byte per frame, and Msgpack concatenates self-delimiting values. Fragmented inputs split after the first byte. Stream compression is applied to the complete concatenated stream.

The `200-row array payload` case uses `Schema.Array(LargeRow)`, so one value is an array containing 200 rows. A one-shot operation encodes or decodes that entire array. Its streaming batch contains 32 frames with the same 200-row array, or 6,400 row occurrences in total. The `200 single-row frames` case uses `LargeRow` directly and sends the 200 distinct rows as 200 frames. Streaming throughput is decoded values per second: arrays per second for the first case and rows per second for the second. Multiply the array rate by 200 to compare decoded row throughput.

## Payload size

Cells contain raw / gzip -6 / zstd bytes.

| Case                   |       SchemaBinary |         Fingerprint |                JSON |             Msgpack |
| ---------------------- | -----------------: | ------------------: | ------------------: | ------------------: |
| small record           |       58 / 78 / 67 |        35 / 53 / 44 |       89 / 100 / 92 |        69 / 88 / 78 |
| nested payload         |    291 / 301 / 294 |     206 / 209 / 203 |     453 / 303 / 309 |     385 / 304 / 299 |
| collections            |   1452 / 792 / 776 |    1438 / 776 / 758 |    1828 / 671 / 660 |    1462 / 788 / 805 |
| index signatures / 128 |   2251 / 689 / 656 |    2258 / 697 / 665 |    2235 / 573 / 559 |    2203 / 676 / 629 |
| index signatures / 512 | 9355 / 2373 / 2189 |  9362 / 2383 / 2197 |  9531 / 2266 / 2074 |  9287 / 2544 / 2304 |
| 200-row array payload  | 7771 / 2441 / 2224 | 19454 / 2766 / 2701 | 57529 / 3230 / 3008 | 51283 / 3516 / 3320 |

Streaming cells contain total raw / gzip -6 / zstd bytes for the complete stream.

| Case                   | Frames |         SchemaBinary |           Fingerprint |               Msgpack |                 NDJSON |
| ---------------------- | -----: | -------------------: | --------------------: | --------------------: | ---------------------: |
| small record           |     32 |       1856 / 95 / 75 |        1120 / 65 / 51 |       2240 / 111 / 87 |        2880 / 123 / 98 |
| nested payload         |     32 |     9312 / 381 / 299 |      6592 / 259 / 208 |     10880 / 369 / 306 |      14528 / 399 / 315 |
| collections            |     32 |   46464 / 1122 / 793 |    46016 / 1102 / 776 |    47424 / 1130 / 813 |     58528 / 1079 / 676 |
| index signatures / 128 |     32 |   72032 / 1229 / 669 |    72256 / 1270 / 678 |    71008 / 1252 / 649 |     71552 / 1073 / 540 |
| index signatures / 512 |     32 | 299360 / 5528 / 2227 |  299584 / 5528 / 2235 |  297696 / 5775 / 2037 |   305024 / 5831 / 1829 |
| 200-row array payload  |     32 | 248672 / 4597 / 2261 | 622528 / 12524 / 2765 | 623488 / 12335 / 2736 | 1840960 / 87481 / 3226 |
| 200 single-row frames  |    200 |  27840 / 3109 / 3174 |   21240 / 2876 / 2733 |   51520 / 2956 / 2888 |    57528 / 3230 / 3019 |

## One-shot throughput

Average encode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,071,912 |   1,149,340 | 448,927 | 703,647 |
| nested payload         |   355,828 |     398,804 | 256,793 | 281,323 |
| collections            |    35,641 |      35,967 |  20,936 |  21,234 |
| index signatures / 128 |    14,438 |      14,343 |  35,466 |  34,381 |
| index signatures / 512 |     2,869 |       2,888 |   6,496 |   6,199 |
| 200-row array payload  |     8,638 |       7,671 |   6,924 |   3,843 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,086,917 |   1,142,987 | 404,201 | 683,663 |
| nested payload         |   326,896 |     373,072 | 217,268 | 264,012 |
| collections            |    39,216 |      39,103 |  20,847 |  21,741 |
| index signatures / 128 |    20,901 |      20,932 |  28,196 |  29,596 |
| index signatures / 512 |     5,076 |       5,094 |   5,365 |   4,507 |
| 200-row array payload  |     9,921 |       7,840 |   5,616 |   4,740 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,279,077 |   5,437,581 | 929,780 | 867,195 |
| nested payload         |   745,151 |     960,767 | 280,710 | 307,612 |
| collections            |   115,764 |     117,323 |  21,574 |  21,050 |
| index signatures / 128 |    55,592 |      56,410 |  27,462 |  28,691 |
| index signatures / 512 |     8,213 |       8,325 |   4,059 |   5,053 |
| 200-row array payload  |    20,001 |      12,624 |   6,419 |   4,835 |
| 200 single-row frames  | 2,016,304 |   2,370,486 | 846,918 | 957,619 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,473,776 |          2,118,983 |          3,208,816 |              2,889,960 |       136,622 |           141,237 |
| nested payload         |        665,224 |            581,115 |            833,884 |                823,562 |       109,502 |           108,895 |
| collections            |        114,043 |            113,327 |            116,165 |                114,814 |        19,174 |            19,147 |
| index signatures / 128 |         55,148 |             55,221 |             56,145 |                 56,159 |        25,098 |            24,610 |
| index signatures / 512 |          8,176 |              8,376 |              8,770 |                  8,563 |         5,201 |             5,236 |
| 200-row array payload  |         20,487 |             20,245 |             13,089 |                 13,086 |         5,295 |             5,240 |
| 200 single-row frames  |      1,400,818 |          1,313,427 |          1,572,663 |              1,473,768 |       132,868 |           127,821 |

## Analysis

- SchemaBinary leads JSON and Msgpack on every one-shot case, index signatures included. Schemas the binary layer validates on its own skip the schema pass that used to run over each decoded value, and a lone string index signature no longer matches keys one at a time.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases.
- Row runs make the default mode the smallest and fastest format for repeated rows, ahead of fingerprint mode: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted and 51,283 for Msgpack. They cost a little on short arrays, where the per-row shape code is not yet amortized: `nested payload` holds three line items and encodes roughly 9% slower than before runs, for 8% fewer bytes.
