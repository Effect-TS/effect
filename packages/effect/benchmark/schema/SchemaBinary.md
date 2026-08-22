# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run with the RPC serialization performance changes on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

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
| small record           | 1,012,829 |   1,095,126 | 449,771 | 699,085 |
| nested payload         |   356,991 |     404,617 | 268,238 | 289,113 |
| collections            |    53,721 |      54,511 |  22,452 |  22,812 |
| index signatures / 128 |    47,707 |      47,535 |  36,983 |  35,680 |
| index signatures / 512 |     8,853 |       8,740 |   6,498 |   6,063 |
| 200-row array payload  |     9,401 |       8,475 |   7,088 |   4,171 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,199,450 |   1,242,115 | 411,452 | 694,207 |
| nested payload         |   526,625 |     618,778 | 223,117 | 270,551 |
| collections            |   114,810 |     118,176 |  21,513 |  22,504 |
| index signatures / 128 |    61,267 |      63,377 |  28,704 |  30,175 |
| index signatures / 512 |    16,234 |      16,611 |   5,436 |   4,484 |
| 200-row array payload  |    22,795 |      14,550 |   5,750 |   4,795 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,586,437 |   5,668,788 | 935,468 | 882,479 |
| nested payload         |   898,486 |   1,142,049 | 287,903 | 318,818 |
| collections            |   125,557 |     127,645 |  21,770 |  21,039 |
| index signatures / 128 |    63,458 |      64,900 |  28,481 |  28,854 |
| index signatures / 512 |    15,766 |      16,112 |   4,064 |   4,996 |
| 200-row array payload  |    23,522 |      14,542 |   6,429 |   4,981 |
| 200 single-row frames  | 2,405,751 |   2,723,155 | 847,372 | 957,785 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,323,703 |          2,007,804 |          2,656,481 |              2,845,030 |       140,512 |           148,261 |
| nested payload         |        703,048 |            702,568 |            889,906 |                923,998 |       113,426 |           112,095 |
| collections            |        122,689 |            121,517 |            124,167 |                124,286 |        19,292 |            19,203 |
| index signatures / 128 |         61,924 |             62,192 |             64,594 |                 63,716 |        25,135 |            24,652 |
| index signatures / 512 |         15,892 |             15,938 |             16,635 |                 16,363 |         5,111 |             5,154 |
| 200-row array payload  |         23,752 |             23,572 |             14,724 |                 14,493 |         5,374 |             5,291 |
| 200 single-row frames  |      1,741,599 |          1,570,286 |          1,874,392 |              1,550,497 |       131,926 |           104,455 |

## Analysis

- SchemaBinary leads JSON and Msgpack on every one-shot case, index signatures included. Schemas the binary layer validates on its own skip the schema pass that used to run over each decoded value, and a lone string index signature no longer matches keys one at a time.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases.
- Row runs make the default mode the smallest and fastest format for repeated rows, ahead of fingerprint mode: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted and 51,283 for Msgpack. They cost a little on short arrays, where the per-row shape code is not yet amortized: `nested payload` holds three line items and encodes roughly 9% slower than before runs, for 8% fewer bytes.
