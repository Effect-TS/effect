# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run at commit `d854fd7c9` on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

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
| small record           | 1,083,812 |   1,104,689 | 431,684 | 708,480 |
| nested payload         |   386,908 |     399,853 | 253,652 | 284,580 |
| collections            |    52,004 |      53,623 |  21,927 |  22,351 |
| index signatures / 128 |    46,620 |      46,380 |  36,181 |  35,102 |
| index signatures / 512 |     8,601 |       8,378 |   6,568 |   6,263 |
| 200-row array payload  |     7,282 |       8,471 |   7,113 |   4,184 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,135,739 |   1,189,669 | 394,682 | 697,231 |
| nested payload         |   511,328 |     559,500 | 212,849 | 262,936 |
| collections            |   112,183 |     112,971 |  21,062 |  22,290 |
| index signatures / 128 |    62,425 |      61,355 |  28,622 |  29,607 |
| index signatures / 512 |    15,913 |      15,686 |   5,396 |   4,569 |
| 200-row array payload  |    11,074 |      12,862 |   5,732 |   4,835 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,252,786 |   5,123,480 | 914,260 | 855,356 |
| nested payload         |   770,680 |     944,310 | 277,764 | 308,887 |
| collections            |   120,646 |     121,229 |  21,830 |  21,217 |
| index signatures / 128 |    64,516 |      64,617 |  28,148 |  28,768 |
| index signatures / 512 |    15,741 |      15,598 |   4,115 |   5,040 |
| 200-row array payload  |    10,785 |      12,613 |   6,491 |   5,053 |
| 200 single-row frames  | 2,126,081 |   2,431,681 | 861,368 | 955,186 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,460,050 |          2,216,227 |          2,997,308 |              2,724,743 |       136,936 |           121,880 |
| nested payload         |        578,884 |            689,451 |            848,984 |                794,700 |       111,254 |           108,171 |
| collections            |        119,007 |            118,729 |            119,230 |                119,443 |        19,291 |            19,358 |
| index signatures / 128 |         64,046 |             62,358 |             63,707 |                 63,685 |        25,199 |            24,520 |
| index signatures / 512 |         15,721 |             15,884 |             15,804 |                 15,930 |         5,252 |             5,297 |
| 200-row array payload  |         11,052 |             11,029 |             13,031 |                 12,984 |         5,301 |             5,178 |
| 200 single-row frames  |      1,341,720 |          1,282,335 |          1,536,088 |              1,310,227 |       128,268 |           124,832 |

## Analysis

- SchemaBinary leads JSON and Msgpack on every one-shot case, index signatures included. Schemas the binary layer validates on its own skip the schema pass that used to run over each decoded value, and a lone string index signature no longer matches keys one at a time.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases. Fingerprint SchemaBinary remains the smallest raw format for struct-heavy values.
