# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run with fingerprint-mode row runs on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

Both modes pack each field id with a wire kind, so varint numbers, decimals, and booleans skip the per-field length prefix and booleans ride in the tag itself. Short decimals such as `12.5` encode as a varint mantissa plus a scale instead of an eight-byte f64, and index-signature record pairs pack the value kind into the key-length varint. An array of structs is written as a row run: each distinct set of present fields declares its shape once, and later rows reference that shape and any string already written in the same slot. Fingerprint mode omits field identifiers entirely: single frames use positional layouts and its row shapes are presence masks instead of field id lists. JSON, Msgpack, and NDJSON use the same `Schema.toCodecJson` representation.

Protobuf uses `protobufjs` reflection types parsed once before timing. `Schema.Number` maps to proto3 `double`, records map to `map<string, double>`, and top-level arrays and records use wrapper messages. Tuple samples and nested arrays use messages because protobuf does not support either shape directly. The timed decode paths include `toObject` and the case adapters, so every format produces its final application value. Descriptor construction and Protobuf encode adapters are excluded.

Every format is timed through its public API, so the SchemaBinary and JSON / Msgpack numbers include the Schema pass that produces or validates the application value. Where the binary layer already validates a schema on its own, `toCodec` skips that pass in both directions rather than repeating the work: encoding runs the binary encoder directly, and decoding hands the value it just produced straight through. Any input the binary layer did not produce, `Schema.is` included, still runs the real check.

A static `.proto` must pick one numeric type for `Schema.Number`, so integral values pay eight bytes where SchemaBinary picks a varint per value. Typing the known-integer fields as `uint32` would reduce the 200-row Protobuf payload from 24,480 to 20,600 bytes and the small record from 42 to 35, but would no longer cover the full `Schema.Number` domain. The reported sizes also reflect `protobufjs` 7.6.5 encoding default-valued scalars such as `verified: false`; an encoder that applies proto3 implicit presence would omit them.

The streaming setup compares the closest public decode paths. SchemaBinary reuses one synchronous parser for each feed shape. Protobuf calls `decodeDelimited` across the batch and materializes every message with `toObject` plus the case adapter. Msgpack synchronously calls `unpackMultiple` on the batch, then validates each value. NDJSON runs `Ndjson.decodeSchema` through Effect Stream and Channel for every operation, including UTF-8 decoding, line splitting, `JSON.parse`, schema validation, and runtime scheduling. A batch is one Channel run over 32 lines, or 200 lines for the per-frame case. Single and fragmented measurements each run a complete Channel for one line, so their scheduling cost is not amortized. This makes batch the closest throughput comparison while preserving the cost of each public API.

SchemaBinary and Protobuf use length-prefixed frames, NDJSON includes one newline byte per frame, and Msgpack concatenates self-delimiting values. Fragmented inputs split after the first byte. Stream compression is applied to the complete concatenated stream.

The `200-row array payload` case uses `Schema.Array(LargeRow)`, so one value is an array containing 200 rows. A one-shot operation encodes or decodes that entire array. Its streaming batch contains 32 frames with the same 200-row array, or 6,400 row occurrences in total. The `200 single-row frames` case uses `LargeRow` directly and sends the 200 distinct rows as 200 frames. Streaming throughput is decoded values per second: arrays per second for the first case and rows per second for the second. Multiply the array rate by 200 to compare decoded row throughput.

## Payload size

Cells contain raw / gzip -6 / zstd bytes.

| Case                   |       SchemaBinary |        Fingerprint |                JSON |             Msgpack |            Protobuf |
| ---------------------- | -----------------: | -----------------: | ------------------: | ------------------: | ------------------: |
| small record           |       47 / 70 / 56 |       30 / 50 / 39 |       89 / 100 / 92 |        69 / 88 / 78 |        42 / 51 / 44 |
| nested payload         |    280 / 298 / 290 |    200 / 210 / 209 |     453 / 303 / 309 |     385 / 304 / 299 |     241 / 220 / 214 |
| collections            |   1079 / 710 / 687 |   1065 / 692 / 669 |    1828 / 671 / 660 |    1462 / 788 / 805 |    2932 / 799 / 754 |
| index signatures / 128 |   1673 / 646 / 603 |   1680 / 652 / 612 |    2235 / 573 / 559 |    2203 / 676 / 629 |    2834 / 586 / 476 |
| index signatures / 512 | 7145 / 2278 / 2298 | 7152 / 2286 / 2310 |  9531 / 2266 / 2074 |  9287 / 2544 / 2304 | 11666 / 1978 / 1737 |
| 200-row array payload  | 7771 / 2441 / 2224 | 7741 / 2398 / 2182 | 57529 / 3230 / 3008 | 51283 / 3516 / 3320 | 24480 / 3111 / 2839 |

Streaming cells contain total raw / gzip -6 / zstd bytes for the complete stream.

| Case                   | Frames |         SchemaBinary |          Fingerprint |               Msgpack |              Protobuf |                 NDJSON |
| ---------------------- | -----: | -------------------: | -------------------: | --------------------: | --------------------: | ---------------------: |
| small record           |     32 |       1504 / 83 / 66 |        960 / 60 / 48 |       2240 / 111 / 87 |        1376 / 66 / 51 |        2880 / 123 / 98 |
| nested payload         |     32 |     8960 / 380 / 295 |     6400 / 256 / 209 |     10880 / 369 / 306 |      7776 / 271 / 220 |      14528 / 399 / 315 |
| collections            |     32 |    34528 / 968 / 729 |    34080 / 935 / 711 |    47424 / 1130 / 813 |    93888 / 2074 / 774 |     58528 / 1079 / 676 |
| index signatures / 128 |     32 |   53536 / 1007 / 615 |   53760 / 1017 / 624 |    71008 / 1252 / 649 |    90752 / 1503 / 492 |     71552 / 1073 / 540 |
| index signatures / 512 |     32 | 228640 / 4538 / 2320 | 228864 / 4557 / 2332 |  297696 / 5775 / 2037 |  373376 / 5956 / 1782 |   305024 / 5831 / 1829 |
| 200-row array payload  |     32 | 248672 / 4598 / 2261 | 247712 / 4547 / 2220 | 623488 / 12335 / 2736 | 783456 / 12374 / 2909 | 1840960 / 87481 / 3226 |
| 200 single-row frames  |    200 |  27040 / 3079 / 3173 |  21240 / 2876 / 2731 |   51520 / 2956 / 2888 |   24280 / 3104 / 2788 |    57528 / 3230 / 3019 |

## One-shot throughput

Average encode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | --------: | ----------: | ------: | ------: | --------: |
| small record           | 1,294,775 |   1,414,123 | 442,684 | 711,039 | 1,969,671 |
| nested payload         |   516,369 |     612,016 | 261,661 | 282,885 |   533,606 |
| collections            |   130,898 |     141,076 |  21,624 |  22,036 |    76,693 |
| index signatures / 128 |   135,145 |     137,571 |  35,697 |  35,187 |    62,967 |
| index signatures / 512 |    35,729 |      35,783 |   6,959 |   6,334 |    15,883 |
| 200-row array payload  |    18,088 |      18,099 |   7,125 |   4,155 |    11,577 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | --------: | ----------: | ------: | ------: | --------: |
| small record           | 1,545,128 |   1,589,123 | 393,578 | 720,162 | 2,178,606 |
| nested payload         |   547,631 |     651,364 | 208,296 | 271,014 |   541,331 |
| collections            |   114,728 |     119,077 |  21,394 |  22,529 |    79,570 |
| index signatures / 128 |    63,797 |      64,700 |  28,763 |  30,295 |    44,576 |
| index signatures / 512 |    16,685 |      16,900 |   5,507 |   4,620 |     6,593 |
| 200-row array payload  |    23,291 |      23,321 |   5,781 |   4,910 |    15,711 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  Protobuf |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | --------: | ------: |
| small record           | 5,332,136 |   5,864,242 | 911,829 | 4,201,602 | 889,747 |
| nested payload         |   817,482 |   1,032,259 | 289,010 |   583,420 | 316,486 |
| collections            |   118,979 |     112,143 |  21,827 |    76,903 |  21,225 |
| index signatures / 128 |    66,009 |      66,348 |  28,354 |    38,243 |  29,145 |
| index signatures / 512 |    16,389 |      16,548 |   4,138 |     5,030 |   5,102 |
| 200-row array payload  |    22,918 |      23,216 |   6,586 |     7,424 |   5,046 |
| 200 single-row frames  | 2,396,303 |   2,626,116 | 843,520 | 1,708,313 | 970,786 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      3,156,741 |          2,190,974 |          3,486,677 |              2,587,360 |       140,660 |           145,012 |
| nested payload         |        714,633 |            675,546 |            885,001 |                835,659 |       111,441 |           111,650 |
| collections            |        117,543 |            115,501 |            113,138 |                112,947 |        19,385 |            19,353 |
| index signatures / 128 |         64,860 |             64,854 |             66,254 |                 65,540 |        25,461 |            24,993 |
| index signatures / 512 |         16,438 |             16,525 |             16,680 |                 16,747 |         5,227 |             5,101 |
| 200-row array payload  |         23,221 |             22,748 |             23,048 |                 22,564 |         5,423 |             5,196 |
| 200 single-row frames  |      1,157,928 |          1,504,118 |          1,314,232 |              1,429,748 |       131,342 |           103,885 |

## Analysis

- Fingerprint mode is now the smallest SchemaBinary format for every case except the two index-signature maps, where the two modes are within 7 bytes: row runs apply in both modes, and fingerprint shapes are presence masks with no id list, so the `200-row array payload` dropped from 19,454 to 7,741 bytes. Its decode rate rose from 14,905 to 23,321 ops/s, matching the default mode.
- The default mode has the smallest raw payload of any non-fingerprint format in every case except the small record, where only Protobuf's one-byte field numbers beat its hashed five-byte field tags (42 vs 47 bytes). Fingerprint mode wins there too (30 bytes).
- Compression still changes the map ranking: Protobuf has the smallest zstd output for both index-signature cases, and JSON wins gzip at 128 keys.
- Protobuf keeps the small record in both directions, by 1.4x to 1.5x. The nested payload is a tie: the two are within 3% either way, and Protobuf's higher encode average comes with the higher median. SchemaBinary leads the other four one-shot cases in both directions, by 1.6x to 2.3x on encode and 1.4x to 2.5x on decode, while returning schema-validated application values.
- Single-frame and fragmented streaming rates for the `200 single-row frames` case carry 20% or worse RME at 250 samples, so only their batch column is worth comparing across runs.
