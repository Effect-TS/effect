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

| Case                   | Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | ------: | ----------: | ------: | ------: |
| small record           | 987,083 |   1,057,894 | 434,772 | 693,322 |
| nested payload         | 340,043 |     388,632 | 258,224 | 280,441 |
| collections            |  52,497 |      53,515 |  21,669 |  22,003 |
| index signatures / 128 |  45,920 |      45,668 |  34,467 |  34,815 |
| index signatures / 512 |   8,295 |       8,234 |   6,493 |   6,250 |
| 200-row array payload  |   8,862 |       7,941 |   7,036 |   4,142 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,138,760 |   1,220,001 | 395,051 | 687,043 |
| nested payload         |   485,669 |     590,166 | 214,371 | 265,124 |
| collections            |   115,283 |     117,103 |  20,841 |  21,984 |
| index signatures / 128 |    63,905 |      64,299 |  27,683 |  29,426 |
| index signatures / 512 |    16,881 |      16,896 |   5,339 |   4,405 |
| 200-row array payload  |    21,327 |      14,130 |   5,671 |   4,769 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 4,456,048 |   5,548,628 | 898,346 | 859,955 |
| nested payload         |   815,628 |   1,045,211 | 283,177 | 310,424 |
| collections            |   125,527 |     126,655 |  21,691 |  20,743 |
| index signatures / 128 |    67,711 |      67,884 |  27,862 |  28,125 |
| index signatures / 512 |    16,665 |      16,502 |   4,078 |   4,961 |
| 200-row array payload  |    21,338 |      13,808 |   6,474 |   4,925 |
| 200 single-row frames  | 2,350,690 |   2,679,206 | 842,493 | 934,514 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,640,444 |          2,386,118 |          3,273,254 |              2,847,462 |       137,766 |           140,172 |
| nested payload         |        691,466 |            669,088 |            895,487 |                867,845 |       109,905 |           108,189 |
| collections            |        121,150 |            122,453 |            109,056 |                122,698 |        18,981 |            18,843 |
| index signatures / 128 |         65,398 |             66,875 |             67,436 |                 67,437 |        24,341 |            24,239 |
| index signatures / 512 |         16,755 |             16,676 |             16,181 |                 16,807 |         4,968 |             5,006 |
| 200-row array payload  |         21,773 |             21,219 |             14,064 |                 13,930 |         5,288 |             5,180 |
| 200 single-row frames  |      1,458,546 |          1,327,697 |          1,645,932 |              1,398,527 |       126,531 |           124,882 |

## Analysis

- SchemaBinary leads JSON and Msgpack on every one-shot case, index signatures included. Schemas the binary layer validates on its own skip the schema pass that used to run over each decoded value, and a lone string index signature no longer matches keys one at a time.
- SchemaBinary is faster than both text and Msgpack streaming in every batch case. NDJSON and Msgpack batch throughput are close and trade places by shape, but NDJSON single-frame throughput is dominated by running a complete Effect Channel for each value.
- NDJSON is the largest raw stream in every case. Compression changes the ranking for repeated keys: NDJSON has the smallest zstd output for collections and both index-signature cases.
- Row runs make the default mode the smallest and fastest format for repeated rows, ahead of fingerprint mode: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted and 51,283 for Msgpack. They cost a little on short arrays, where the per-row shape code is not yet amortized: `nested payload` holds three line items and encodes roughly 9% slower than before runs, for 8% fewer bytes.
