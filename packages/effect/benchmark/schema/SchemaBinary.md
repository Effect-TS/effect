# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run with the RPC serialization performance changes on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

The default mode writes an array of structs as a row run: each distinct set of present fields declares its field ids once, and later rows reference that shape and any string already written in the same slot. Fingerprint mode instead omits field identifiers entirely when the schema fingerprint matches. JSON, Msgpack, and NDJSON use the same `Schema.toCodecJson` representation.

Protobuf uses `protobufjs` reflection types parsed once before timing. `Schema.Number` maps to proto3 `double`, records map to `map<string, double>`, and top-level arrays and records use wrapper messages. Tuple samples and nested arrays use messages because protobuf does not support either shape directly. The timed decode paths include `toObject` and the case adapters, so every format produces its final application value. Descriptor construction and Protobuf encode adapters are excluded.

A static `.proto` must pick one numeric type for `Schema.Number`, so integral values pay eight bytes where SchemaBinary picks a varint per value. Typing the known-integer fields as `uint32` would reduce the 200-row Protobuf payload from 24,480 to 20,600 bytes and the small record from 42 to 35, but would no longer cover the full `Schema.Number` domain. The reported sizes also reflect `protobufjs` 7.6.5 encoding default-valued scalars such as `verified: false`; an encoder that applies proto3 implicit presence would omit them.

The streaming setup compares the closest public decode paths. SchemaBinary reuses one synchronous parser for each feed shape. Protobuf calls `decodeDelimited` across the batch and materializes every message with `toObject` plus the case adapter. Msgpack synchronously calls `unpackMultiple` on the batch, then validates each value. NDJSON runs `Ndjson.decodeSchema` through Effect Stream and Channel for every operation, including UTF-8 decoding, line splitting, `JSON.parse`, schema validation, and runtime scheduling. A batch is one Channel run over 32 lines, or 200 lines for the per-frame case. Single and fragmented measurements each run a complete Channel for one line, so their scheduling cost is not amortized. This makes batch the closest throughput comparison while preserving the cost of each public API.

SchemaBinary and Protobuf use length-prefixed frames, NDJSON includes one newline byte per frame, and Msgpack concatenates self-delimiting values. Fragmented inputs split after the first byte. Stream compression is applied to the complete concatenated stream.

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
| small record           | 1,005,354 |   1,075,326 | 454,972 | 712,441 | 1,989,533 |
| nested payload         |   358,129 |     406,674 | 269,261 | 288,895 |   529,032 |
| collections            |    54,121 |      55,262 |  21,987 |  22,263 |    77,116 |
| index signatures / 128 |    47,723 |      47,754 |  36,479 |  35,702 |    63,938 |
| index signatures / 512 |     8,860 |       8,798 |   6,775 |   6,264 |    15,484 |
| 200-row array payload  |     9,392 |       8,532 |   7,085 |   4,183 |    11,637 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | --------: | ----------: | ------: | ------: | --------: |
| small record           | 1,190,127 |   1,184,732 | 409,372 | 692,531 | 2,158,642 |
| nested payload         |   524,219 |     630,473 | 223,735 | 274,498 |   576,093 |
| collections            |   116,213 |     118,398 |  21,005 |  22,154 |    81,990 |
| index signatures / 128 |    63,109 |      62,646 |  28,784 |  30,254 |    44,869 |
| index signatures / 512 |    16,740 |      16,842 |   5,382 |   4,530 |     6,428 |
| 200-row array payload  |    23,213 |      14,586 |   5,680 |   4,808 |    15,679 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  Protobuf |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | --------: | ------: |
| small record           | 4,735,438 |   5,571,415 | 884,779 | 2,715,660 | 831,283 |
| nested payload         |   857,952 |   1,135,201 | 292,007 |   593,558 | 310,213 |
| collections            |   126,431 |     127,203 |  21,357 |    77,204 |  20,219 |
| index signatures / 128 |    65,343 |      64,895 |  28,254 |    38,970 |  28,688 |
| index signatures / 512 |    16,371 |      16,276 |   4,087 |     5,226 |   5,027 |
| 200-row array payload  |    23,438 |      14,621 |   6,433 |     7,552 |   4,951 |
| 200 single-row frames  | 2,334,920 |   2,708,528 | 863,408 | 1,666,145 | 960,882 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      2,226,286 |          2,035,265 |          2,669,970 |              2,681,194 |       112,400 |           111,959 |
| nested payload         |        697,988 |            737,986 |            907,001 |                915,173 |       106,504 |           105,376 |
| collections            |        124,113 |            122,500 |            123,547 |                123,732 |        18,256 |            18,408 |
| index signatures / 128 |         64,263 |             64,097 |             64,379 |                 63,899 |        24,945 |            24,325 |
| index signatures / 512 |         16,407 |             16,520 |             16,763 |                 16,546 |         5,092 |             5,134 |
| 200-row array payload  |         23,799 |             23,509 |             14,868 |                 14,551 |         5,251 |             5,202 |
| 200 single-row frames  |      1,629,270 |          1,490,224 |          1,865,866 |              1,511,875 |       132,078 |           127,208 |

## Analysis

- Protobuf has the fastest one-shot encode rate in every case and the fastest decode rate for the small record. SchemaBinary leads the other five decode cases while returning schema-validated application values.
- SchemaBinary is faster than Protobuf, Msgpack, and NDJSON streaming in every batch case.
- The smaller SchemaBinary mode beats Protobuf's raw size in every case. Compression changes the ranking for maps: Protobuf has the smallest zstd output for both index-signature cases and the smallest gzip output at 512 keys, while JSON wins gzip at 128 keys.
- Row runs make the default mode the smallest and fastest SchemaBinary format for repeated rows: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted, 24,480 for Protobuf, and 51,283 for Msgpack. They cost a little on short arrays, where the per-row shape code is not yet amortized: `nested payload` holds three line items and encodes roughly 9% slower than before runs, for 8% fewer bytes.
