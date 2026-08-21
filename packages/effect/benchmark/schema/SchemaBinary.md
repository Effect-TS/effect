# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run at commit `ef9b90a9b` on Linux x86_64 with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

Fingerprint mode omits field identifiers when the schema fingerprint matches. JSON, Msgpack, and NDJSON use the same `Schema.toCodecJson` representation.

The streaming setup compares the closest public decode paths. SchemaBinary reuses one synchronous parser for each feed shape. Msgpack synchronously calls `unpackMultiple` on the batch, then validates each value. NDJSON runs `Ndjson.decodeSchema` through Effect Stream and Channel for every operation, including UTF-8 decoding, line splitting, `JSON.parse`, schema validation, and runtime scheduling. A batch is one Channel run over 32 lines, or 200 lines for the per-frame case. Single and fragmented measurements each run a complete Channel for one line, so their scheduling cost is not amortized. This makes batch the closest throughput comparison while preserving the cost of each public API.

SchemaBinary uses length-prefixed frames, NDJSON includes one newline byte per frame, and Msgpack concatenates self-delimiting values. Fragmented inputs split after the first byte. Stream compression is applied to the complete concatenated stream.

The `200-row array payload` case uses `Schema.Array(LargeRow)`, so one value is an array containing 200 rows. A one-shot operation encodes or decodes that entire array. Its streaming batch contains 32 frames with the same 200-row array, or 6,400 row occurrences in total. The `200 single-row frames` case uses `LargeRow` directly and sends the 200 distinct rows as 200 frames. Streaming throughput is decoded values per second: arrays per second for the first case and rows per second for the second. Multiply the array rate by 200 to compare decoded row throughput.

## Payload size

Cells contain raw / gzip -6 / zstd bytes.

| Case                   |        SchemaBinary |         Fingerprint |                JSON |             Msgpack |
| ---------------------- | ------------------: | ------------------: | ------------------: | ------------------: |
| small record           |        58 / 78 / 67 |        35 / 53 / 44 |       89 / 100 / 92 |        69 / 88 / 78 |
| nested payload         |     318 / 305 / 300 |     206 / 209 / 203 |     453 / 303 / 309 |     385 / 304 / 299 |
| collections            |    1452 / 792 / 776 |    1438 / 776 / 758 |    1828 / 671 / 660 |    1462 / 788 / 805 |
| index signatures / 128 |    2251 / 689 / 656 |    2258 / 697 / 665 |    2235 / 573 / 559 |    2203 / 676 / 629 |
| index signatures / 512 |  9355 / 2373 / 2189 |  9362 / 2383 / 2197 |  9531 / 2266 / 2074 |  9287 / 2544 / 2304 |
| 200-row array payload  | 27646 / 3065 / 3175 | 19454 / 2766 / 2701 | 57529 / 3230 / 3008 | 51283 / 3516 / 3320 |

Streaming cells contain total raw / gzip -6 / zstd bytes for the complete stream.

| Case                   | Frames |          SchemaBinary |           Fingerprint |               Msgpack |                 NDJSON |
| ---------------------- | -----: | --------------------: | --------------------: | --------------------: | ---------------------: |
| small record           |     32 |        1856 / 95 / 75 |        1120 / 65 / 51 |       2240 / 111 / 87 |        2880 / 123 / 98 |
| nested payload         |     32 |     10176 / 391 / 305 |      6592 / 259 / 208 |     10880 / 369 / 306 |      14528 / 399 / 315 |
| collections            |     32 |    46464 / 1122 / 793 |    46016 / 1102 / 776 |    47424 / 1130 / 813 |     58528 / 1079 / 676 |
| index signatures / 128 |     32 |    72032 / 1229 / 669 |    72256 / 1270 / 678 |    71008 / 1252 / 649 |     71552 / 1073 / 540 |
| index signatures / 512 |     32 |  299360 / 5528 / 2227 |  299584 / 5528 / 2235 |  297696 / 5775 / 2037 |   305024 / 5831 / 1829 |
| 200-row array payload  |     32 | 884672 / 14110 / 3259 | 622528 / 12524 / 2765 | 623488 / 12335 / 2736 | 1840960 / 87481 / 3226 |
| 200 single-row frames  |    200 |   27840 / 3109 / 3174 |   21240 / 2876 / 2733 |   51520 / 2956 / 2888 |    57528 / 3230 / 3019 |

## One-shot throughput

Average encode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,138,225 |   1,147,081 | 452,215 | 715,571 |
| nested payload         |   395,240 |     408,163 | 263,498 | 281,540 |
| collections            |    35,376 |      35,651 |  21,778 |  22,134 |
| index signatures / 128 |    14,096 |      14,167 |  35,928 |  35,077 |
| index signatures / 512 |     2,871 |       2,867 |   6,508 |   6,314 |
| 200-row array payload  |     6,995 |       8,128 |   6,125 |   4,038 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,121,650 |   1,115,901 | 418,359 | 687,335 |
| nested payload         |   354,482 |     376,201 | 217,858 | 266,371 |
| collections            |    39,697 |      39,708 |  20,723 |  21,943 |
| index signatures / 128 |    20,589 |      20,675 |  28,624 |  29,884 |
| index signatures / 512 |     4,988 |       4,969 |   5,411 |   4,562 |
| 200-row array payload  |     7,233 |       7,934 |   5,630 |   4,761 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,385,709 |   5,493,837 | 901,253 | 849,385 |
| nested payload         |   819,281 |     977,777 | 284,386 | 306,687 |
| collections            |   118,938 |     119,806 |  21,189 |  20,364 |
| index signatures / 128 |    58,715 |      58,699 |  27,863 |  28,431 |
| index signatures / 512 |     8,374 |       8,322 |   4,055 |   5,064 |
| 200-row array payload  |    11,147 |      12,996 |   6,345 |   4,953 |
| 200 single-row frames  | 2,127,598 |   2,382,278 | 856,723 | 946,703 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,585,851 |          2,296,255 |          3,131,403 |              2,871,336 |       137,242 |           142,477 |
| nested payload         |        710,222 |            699,114 |            836,484 |                826,233 |       109,985 |           108,842 |
| collections            |        116,964 |            116,132 |            117,837 |                116,882 |        18,463 |            18,438 |
| index signatures / 128 |         57,343 |             57,974 |             58,448 |                 58,763 |        24,688 |            24,643 |
| index signatures / 512 |          8,414 |              8,704 |              8,793 |                  8,619 |         5,218 |             5,195 |
| 200-row array payload  |         11,419 |             11,474 |             13,312 |                 13,295 |         5,206 |             5,127 |
| 200 single-row frames  |      1,390,397 |          1,369,513 |          1,594,590 |              1,512,635 |       130,684 |           127,909 |

## Analysis

- SchemaBinary leads JSON and Msgpack on struct- and collection-heavy one-shot cases. JSON and Msgpack remain faster on large index-signature encodes, where field lookup dominates and the binary layout offers little structural advantage.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases. Fingerprint SchemaBinary remains the smallest raw format for struct-heavy values.
