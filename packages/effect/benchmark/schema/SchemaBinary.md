# SchemaBinary benchmark

Run from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/schema/SchemaBinary.ts
```

These results are from one full run at commit `f104ae4e2` on Linux x86_64 with Node 26.7.0. Codec and schema construction are excluded. One-shot tasks use 100 warmups and 1,000 measured samples; streaming tasks use 25 warmups and 250 measured samples. Throughput is machine-local and should only be compared within this run.

`SchemaBinary copy` adds `.slice()` to each arena-backed encode result. Fingerprint mode omits field identifiers when the schema fingerprint matches. JSON and Msgpack use the same `Schema.toCodecJson` representation. Streaming compares single-frame, 32-frame batch, and first-byte-fragmented feeds; the per-frame case contains 200 frames. JSON is omitted from streaming because its comparable Effect API adds NDJSON framing and Channel overhead.

## Payload size

Cells contain raw / gzip -6 / zstd bytes. The arena and ownership-copy variants have identical payloads.

| Case                   |        SchemaBinary |         Fingerprint |                JSON |             Msgpack |
| ---------------------- | ------------------: | ------------------: | ------------------: | ------------------: |
| small record           |        58 / 78 / 67 |        35 / 53 / 44 |       89 / 100 / 92 |        69 / 88 / 78 |
| nested payload         |     318 / 305 / 300 |     206 / 209 / 203 |     453 / 303 / 309 |     385 / 304 / 299 |
| collections            |    1452 / 792 / 776 |    1438 / 776 / 758 |    1828 / 671 / 660 |    1462 / 788 / 805 |
| index signatures / 128 |    2251 / 689 / 656 |    2258 / 697 / 665 |    2235 / 573 / 559 |    2203 / 676 / 629 |
| index signatures / 512 |  9355 / 2373 / 2189 |  9362 / 2383 / 2197 |  9531 / 2266 / 2074 |  9287 / 2544 / 2304 |
| large repeated records | 27646 / 3065 / 3175 | 19454 / 2766 / 2701 | 57529 / 3230 / 3008 | 51283 / 3516 / 3320 |

Streaming cells contain total raw / gzip -6 / zstd bytes for the complete stream.

| Case                       | Frames |          SchemaBinary |           Fingerprint |               Msgpack |
| -------------------------- | -----: | --------------------: | --------------------: | --------------------: |
| small record               |     32 |        1856 / 95 / 75 |        1120 / 65 / 51 |       2240 / 111 / 87 |
| nested payload             |     32 |     10176 / 391 / 305 |      6592 / 259 / 208 |     10880 / 369 / 306 |
| collections                |     32 |    46464 / 1122 / 793 |    46016 / 1102 / 776 |    47424 / 1130 / 813 |
| index signatures / 128     |     32 |    72032 / 1229 / 669 |    72256 / 1270 / 678 |    71008 / 1252 / 649 |
| index signatures / 512     |     32 |  299360 / 5528 / 2227 |  299584 / 5528 / 2235 |  297696 / 5775 / 2037 |
| large repeated records     |     32 | 884672 / 14110 / 3259 | 622528 / 12524 / 2765 | 623488 / 12335 / 2736 |
| per-frame repeated records |    200 |   27840 / 3109 / 3174 |   21240 / 2876 / 2733 |   51520 / 2956 / 2888 |

## One-shot throughput

Average encode operations per second:

| Case                   |     Arena | Ownership copy | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | -------------: | ----------: | ------: | ------: |
| small record           | 1,151,049 |      1,092,931 |   1,087,246 | 482,778 | 712,346 |
| nested payload         |   392,058 |        357,886 |     417,879 | 269,424 | 291,923 |
| collections            |    35,819 |         34,849 |      35,995 |  22,209 |  22,499 |
| index signatures / 128 |    14,340 |         14,232 |      14,501 |  36,801 |  35,549 |
| index signatures / 512 |     2,861 |          2,878 |       2,837 |   6,719 |   6,548 |
| large repeated records |     7,044 |          7,084 |       7,932 |   6,116 |   4,025 |

Average decode operations per second:

| Case                   |   Default | Fingerprint |    JSON | Msgpack |
| ---------------------- | --------: | ----------: | ------: | ------: |
| small record           | 1,148,822 |   1,129,656 | 441,118 | 697,698 |
| nested payload         |   361,218 |     393,578 | 231,420 | 275,843 |
| collections            |    40,099 |      39,840 |  21,297 |  22,567 |
| index signatures / 128 |    20,851 |      20,835 |  29,069 |  30,125 |
| index signatures / 512 |     4,951 |       4,872 |   5,323 |   4,495 |
| large repeated records |     7,301 |       8,088 |   5,716 |   4,823 |

## Streaming decode throughput

Average decoded values per second:

| Case                       | Default single | Default batch | Default fragmented | Fingerprint single | Fingerprint batch | Fingerprint fragmented | Msgpack batch |
| -------------------------- | -------------: | ------------: | -----------------: | -----------------: | ----------------: | ---------------------: | ------------: |
| small record               |      2,143,713 |     3,227,549 |          1,274,802 |          1,861,523 |         2,798,943 |              1,526,738 |       826,335 |
| nested payload             |        714,097 |       796,126 |            686,323 |            832,452 |           934,611 |                776,966 |       263,124 |
| collections                |        114,999 |       117,279 |            115,139 |            116,678 |           117,593 |                115,477 |        21,349 |
| index signatures / 128     |         52,395 |        56,342 |             56,245 |             55,948 |            56,211 |                 56,283 |        27,815 |
| index signatures / 512     |          8,518 |         8,314 |              8,717 |              8,766 |             8,244 |                  8,684 |         4,052 |
| large repeated records     |         11,340 |        11,118 |             11,373 |             13,183 |            13,095 |                 13,041 |         6,362 |
| per-frame repeated records |      1,413,658 |     2,117,564 |          1,323,406 |          1,624,465 |         2,415,339 |              1,525,274 |       854,785 |

## Analysis

- SchemaBinary leads JSON and Msgpack on struct- and collection-heavy one-shot cases. JSON and Msgpack remain faster on large index-signature encodes, where field lookup dominates and the binary layout offers little structural advantage.
- Fingerprint mode reduces raw size by 30% to 40% for the small, nested, and large repeated-record cases, but is marginally larger for index-signature records. Compression narrows the size differences because repeated field identifiers compress well.
- Stateful SchemaBinary streaming is faster than the Msgpack batch across every case in this run. Fingerprint mode is especially useful for repeated struct frames, while collection and index-signature throughput is effectively even with the default wire mode.
