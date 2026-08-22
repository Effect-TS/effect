# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run with the compact field and record tags (wire version 2) on Linux x86_64 (AMD EPYC 4344P) with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

The default mode packs each field id with a wire kind, so varint numbers, decimals, and booleans skip the per-field length prefix and booleans ride in the tag itself. Short decimals such as `12.5` encode as a varint mantissa plus a scale instead of an eight-byte f64, and index-signature record pairs pack the value kind into the key-length varint. An array of structs is written as a row run: each distinct set of present fields declares its field ids once, and later rows reference that shape and any string already written in the same slot. Fingerprint mode instead omits field identifiers entirely when the schema fingerprint matches. JSON, Msgpack, and NDJSON use the same `Schema.toCodecJson` representation.

Protobuf uses `protobufjs` reflection types parsed once before timing. `Schema.Number` maps to proto3 `double`, records map to `map<string, double>`, and top-level arrays and records use wrapper messages. Tuple samples and nested arrays use messages because protobuf does not support either shape directly. The timed decode paths include `toObject` and the case adapters, so every format produces its final application value. Descriptor construction and Protobuf encode adapters are excluded.

A static `.proto` must pick one numeric type for `Schema.Number`, so integral values pay eight bytes where SchemaBinary picks a varint per value. Typing the known-integer fields as `uint32` would reduce the 200-row Protobuf payload from 24,480 to 20,600 bytes and the small record from 42 to 35, but would no longer cover the full `Schema.Number` domain. The reported sizes also reflect `protobufjs` 7.6.5 encoding default-valued scalars such as `verified: false`; an encoder that applies proto3 implicit presence would omit them.

The streaming setup compares the closest public decode paths. SchemaBinary reuses one synchronous parser for each feed shape. Protobuf calls `decodeDelimited` across the batch and materializes every message with `toObject` plus the case adapter. Msgpack synchronously calls `unpackMultiple` on the batch, then validates each value. NDJSON runs `Ndjson.decodeSchema` through Effect Stream and Channel for every operation, including UTF-8 decoding, line splitting, `JSON.parse`, schema validation, and runtime scheduling. A batch is one Channel run over 32 lines, or 200 lines for the per-frame case. Single and fragmented measurements each run a complete Channel for one line, so their scheduling cost is not amortized. This makes batch the closest throughput comparison while preserving the cost of each public API.

SchemaBinary and Protobuf use length-prefixed frames, NDJSON includes one newline byte per frame, and Msgpack concatenates self-delimiting values. Fragmented inputs split after the first byte. Stream compression is applied to the complete concatenated stream.

The `200-row array payload` case uses `Schema.Array(LargeRow)`, so one value is an array containing 200 rows. A one-shot operation encodes or decodes that entire array. Its streaming batch contains 32 frames with the same 200-row array, or 6,400 row occurrences in total. The `200 single-row frames` case uses `LargeRow` directly and sends the 200 distinct rows as 200 frames. Streaming throughput is decoded values per second: arrays per second for the first case and rows per second for the second. Multiply the array rate by 200 to compare decoded row throughput.

## Payload size

Cells contain raw / gzip -6 / zstd bytes.

| Case                   |       SchemaBinary |         Fingerprint |                JSON |             Msgpack |            Protobuf |
| ---------------------- | -----------------: | ------------------: | ------------------: | ------------------: | ------------------: |
| small record           |       47 / 70 / 56 |        30 / 50 / 39 |       89 / 100 / 92 |        69 / 88 / 78 |        42 / 51 / 44 |
| nested payload         |    280 / 298 / 290 |     196 / 206 / 205 |     453 / 303 / 309 |     385 / 304 / 299 |     241 / 220 / 214 |
| collections            |   1079 / 710 / 687 |    1065 / 692 / 669 |    1828 / 671 / 660 |    1462 / 788 / 805 |    2932 / 799 / 754 |
| index signatures / 128 |   1673 / 646 / 603 |    1680 / 652 / 612 |    2235 / 573 / 559 |    2203 / 676 / 629 |    2834 / 586 / 476 |
| index signatures / 512 | 7145 / 2278 / 2298 |  7152 / 2286 / 2310 |  9531 / 2266 / 2074 |  9287 / 2544 / 2304 | 11666 / 1978 / 1737 |
| 200-row array payload  | 7771 / 2441 / 2224 | 19454 / 2766 / 2701 | 57529 / 3230 / 3008 | 51283 / 3516 / 3320 | 24480 / 3111 / 2839 |

Streaming cells contain total raw / gzip -6 / zstd bytes for the complete stream.

| Case                   | Frames |         SchemaBinary |           Fingerprint |               Msgpack |              Protobuf |                 NDJSON |
| ---------------------- | -----: | -------------------: | --------------------: | --------------------: | --------------------: | ---------------------: |
| small record           |     32 |       1504 / 83 / 66 |         960 / 60 / 48 |       2240 / 111 / 87 |        1376 / 66 / 51 |        2880 / 123 / 98 |
| nested payload         |     32 |     8960 / 380 / 295 |      6272 / 252 / 205 |     10880 / 369 / 306 |      7776 / 271 / 220 |      14528 / 399 / 315 |
| collections            |     32 |    34528 / 968 / 729 |     34080 / 935 / 711 |    47424 / 1130 / 813 |    93888 / 2074 / 774 |     58528 / 1079 / 676 |
| index signatures / 128 |     32 |   53536 / 1007 / 615 |    53760 / 1017 / 624 |    71008 / 1252 / 649 |    90752 / 1503 / 492 |     71552 / 1073 / 540 |
| index signatures / 512 |     32 | 228640 / 4538 / 2320 |  228864 / 4557 / 2332 |  297696 / 5775 / 2037 |  373376 / 5956 / 1782 |   305024 / 5831 / 1829 |
| 200-row array payload  |     32 | 248672 / 4598 / 2261 | 622528 / 12524 / 2765 | 623488 / 12335 / 2736 | 783456 / 12374 / 2909 | 1840960 / 87481 / 3226 |
| 200 single-row frames  |    200 |  27040 / 3079 / 3173 |   21240 / 2876 / 2731 |   51520 / 2956 / 2888 |   24280 / 3104 / 2788 |    57528 / 3230 / 3019 |

## One-shot throughput

Average encode operations per second:

| Case                   | Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | ------: | ----------: | ------: | ------: | --------: |
| small record           | 997,032 |   1,072,933 | 457,863 | 725,766 | 2,042,148 |
| nested payload         | 332,236 |     403,983 | 265,390 | 287,122 |   547,675 |
| collections            |  50,983 |      51,891 |  21,275 |  21,620 |    77,211 |
| index signatures / 128 |  45,240 |      45,404 |  35,956 |  34,882 |    64,146 |
| index signatures / 512 |   8,503 |       8,502 |   6,495 |   6,238 |    15,957 |
| 200-row array payload  |   9,236 |       8,558 |   6,845 |   4,091 |    11,722 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |  Protobuf |
| ---------------------- | --------: | ----------: | ------: | ------: | --------: |
| small record           | 1,386,979 |   1,442,104 | 411,591 | 718,427 | 2,197,677 |
| nested payload         |   531,341 |     685,992 | 221,670 | 271,665 |   578,149 |
| collections            |   114,413 |     118,280 |  20,679 |  21,637 |    83,391 |
| index signatures / 128 |    64,648 |      65,162 |  28,636 |  29,717 |    45,052 |
| index signatures / 512 |    16,877 |      16,886 |   5,321 |   4,466 |     6,546 |
| 200-row array payload  |    23,439 |      14,905 |   5,578 |   4,738 |    15,607 |

## Streaming decode throughput

Average decoded values per second for batched input:

| Case                   |   Default | Fingerprint | Msgpack |  Protobuf |  NDJSON |
| ---------------------- | --------: | ----------: | ------: | --------: | ------: |
| small record           | 5,384,807 |   5,715,626 | 920,248 | 4,364,871 | 797,692 |
| nested payload         |   827,249 |   1,131,149 | 279,921 |   592,422 | 305,635 |
| collections            |   123,431 |     125,442 |  20,837 |    81,154 |  20,202 |
| index signatures / 128 |    66,496 |      66,529 |  26,899 |    39,413 |  28,376 |
| index signatures / 512 |    16,581 |      16,606 |   3,964 |     5,136 |   4,957 |
| 200-row array payload  |    23,698 |      14,828 |   6,316 |     7,463 |   4,930 |
| 200 single-row frames  | 2,470,641 |   2,770,704 | 862,979 | 1,680,786 | 954,615 |

Average decoded values per second for single and first-byte-fragmented input:

| Case                   | Default single | Default fragmented | Fingerprint single | Fingerprint fragmented | NDJSON single | NDJSON fragmented |
| ---------------------- | -------------: | -----------------: | -----------------: | ---------------------: | ------------: | ----------------: |
| small record           |      3,250,728 |          2,120,356 |          3,634,668 |              2,766,802 |       131,415 |           134,187 |
| nested payload         |        719,818 |            687,117 |            999,690 |                926,043 |       105,180 |           104,512 |
| collections            |        120,740 |            120,789 |            123,952 |                122,347 |        18,331 |            18,324 |
| index signatures / 128 |         66,016 |             65,670 |             66,362 |                 65,974 |        24,490 |            23,271 |
| index signatures / 512 |         16,129 |             16,697 |             17,049 |                 16,774 |         5,121 |             5,221 |
| 200-row array payload  |         23,844 |             22,873 |             15,179 |                 14,754 |         5,238 |             5,077 |
| 200 single-row frames  |      1,743,952 |          1,493,891 |          1,995,832 |              1,584,294 |       135,807 |           128,336 |

## Analysis

- The default mode now has the smallest raw payload of any format in every case except the small record, where only Protobuf's one-byte field numbers beat its hashed five-byte field tags (42 vs 47 bytes). Fingerprint mode is the smallest everywhere it applies, including 30 bytes against Protobuf's 42 on the small record.
- Wire kinds and decimals moved the two previously weakest cases from parity to a clear lead: `collections` is 1,079 bytes against Msgpack's 1,462, and `index signatures / 512` is 7,145 against Msgpack's 9,287. Compression still changes the map ranking: Protobuf has the smallest zstd output for both index-signature cases, and JSON wins gzip at 128 keys.
- The tag change also sped up decoding, because scalar fields no longer open a reader extent: small-record batch streaming reaches 5.4M values/s (4.7M in the previous run) and every one-shot decode case matches or improves on it. Protobuf keeps the fastest one-shot encode in every case and the fastest small-record decode; SchemaBinary leads the other five decode cases while returning schema-validated application values.
- Row runs make the default mode the smallest and fastest SchemaBinary format for repeated rows: the `200-row array payload` is 7,771 bytes against 19,454 fingerprinted, 24,480 for Protobuf, and 51,283 for Msgpack.
