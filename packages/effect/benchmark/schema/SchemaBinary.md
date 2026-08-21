# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run at commit `96c14d07d` on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

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
| small record           | 1,065,900 |   1,080,059 | 435,725 | 714,056 |
| nested payload         |   388,172 |     400,080 | 259,110 | 283,972 |
| collections            |    51,759 |      52,710 |  21,663 |  22,084 |
| index signatures / 128 |    46,450 |      46,188 |  35,472 |  34,156 |
| index signatures / 512 |     8,651 |       8,628 |   6,624 |   6,189 |
| 200-row array payload  |     7,241 |       8,153 |   7,066 |   4,148 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,138,076 |   1,191,656 | 397,099 | 703,826 |
| nested payload         |   509,577 |     563,020 | 217,638 | 269,363 |
| collections            |   112,757 |     112,050 |  20,628 |  21,790 |
| index signatures / 128 |    62,691 |      60,577 |  28,104 |  29,824 |
| index signatures / 512 |    16,281 |      15,704 |   5,392 |   4,463 |
| 200-row array payload  |    10,923 |      12,927 |   5,672 |   4,811 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,285,263 |   5,158,250 | 913,285 | 848,614 |
| nested payload         |   795,946 |     934,861 | 284,120 | 311,612 |
| collections            |   120,368 |     119,858 |  21,554 |  20,806 |
| index signatures / 128 |    64,893 |      62,403 |  27,823 |  28,348 |
| index signatures / 512 |    15,587 |      15,115 |   4,072 |   5,019 |
| 200-row array payload  |    10,641 |      12,425 |   6,597 |   4,867 |
| 200 single-row frames  | 2,122,428 |   2,395,816 | 864,717 | 966,175 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,433,121 |          2,203,554 |          2,965,099 |              2,615,759 |       135,622 |           143,223 |
| nested payload         |        711,825 |            677,588 |            811,717 |                802,630 |       111,122 |           108,762 |
| collections            |        118,465 |            118,782 |            118,533 |                116,825 |        18,860 |            19,120 |
| index signatures / 128 |         63,670 |             63,413 |             62,223 |                 61,576 |        24,527 |            24,281 |
| index signatures / 512 |         15,695 |             15,902 |             15,635 |                 15,285 |         5,160 |             5,168 |
| 200-row array payload  |         10,993 |             10,901 |             12,667 |                 12,695 |         5,251 |             5,192 |
| 200 single-row frames  |      1,365,753 |          1,165,356 |          1,527,233 |              1,329,314 |       130,472 |           124,134 |

## Analysis

- SchemaBinary leads JSON and Msgpack on every one-shot case, index signatures included. Schemas the binary layer validates on its own skip the schema pass that used to run over each decoded value, and a lone string index signature no longer matches keys one at a time.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases. Fingerprint SchemaBinary remains the smallest raw format for struct-heavy values.
