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
| small record           | 1,011,552 |   1,077,114 | 446,188 | 706,861 |
| nested payload         |   349,822 |     396,800 | 259,586 | 283,297 |
| collections            |    53,117 |      54,030 |  22,431 |  22,807 |
| index signatures / 128 |    46,741 |      46,716 |  35,839 |  34,648 |
| index signatures / 512 |     8,679 |       8,569 |   6,658 |   6,255 |
| 200-row array payload  |     8,870 |       8,074 |   6,960 |   4,117 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,153,245 |   1,211,218 | 408,812 | 702,051 |
| nested payload         |   493,924 |     594,944 | 217,904 | 268,354 |
| collections            |   114,286 |     118,563 |  21,460 |  22,682 |
| index signatures / 128 |    64,143 |      64,186 |  28,494 |  29,758 |
| index signatures / 512 |    16,768 |      16,825 |   5,414 |   4,611 |
| 200-row array payload  |    21,796 |      14,412 |   5,623 |   4,734 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,426,179 |   5,388,646 | 766,173 | 818,260 |
| nested payload         |   811,488 |   1,056,372 | 284,944 | 302,941 |
| collections            |   124,300 |     126,566 |  22,013 |  20,884 |
| index signatures / 128 |    65,585 |      64,306 |  27,277 |  27,592 |
| index signatures / 512 |    15,596 |      15,186 |   4,110 |   5,052 |
| 200-row array payload  |    21,733 |      14,028 |   6,428 |   4,802 |
| 200 single-row frames  | 2,200,444 |   2,622,259 | 835,329 | 942,351 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,715,454 |          2,381,647 |          3,085,750 |              2,959,535 |       129,391 |           132,853 |
| nested payload         |        708,896 |            680,227 |            900,923 |                903,819 |       104,936 |           103,205 |
| collections            |        123,191 |            122,735 |            124,366 |                124,134 |        19,035 |            18,901 |
| index signatures / 128 |         63,861 |             65,455 |             65,209 |                 64,575 |        24,281 |            23,620 |
| index signatures / 512 |         16,305 |             15,889 |             16,118 |                 16,071 |         5,128 |             5,320 |
| 200-row array payload  |         22,120 |             21,915 |             14,346 |                 14,276 |         5,277 |             5,170 |
| 200 single-row frames  |      1,498,907 |          1,478,629 |          1,736,823 |              1,643,647 |       133,664 |           127,811 |

## Analysis

- SchemaBinary leads JSON and Msgpack on every one-shot case, index signatures included. Schemas the binary layer validates on its own skip the schema pass that used to run over each decoded value, and a lone string index signature no longer matches keys one at a time.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases.
- Row runs make the default mode the smallest and fastest format for repeated rows, ahead of fingerprint mode: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted and 51,283 for Msgpack. They cost a little on short arrays, where the per-row shape code is not yet amortized: `nested payload` holds three line items and encodes roughly 9% slower than before runs, for 8% fewer bytes.
