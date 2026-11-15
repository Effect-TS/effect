# Parquet conformance

The reader in `effect/encoding/Parquet` targets
[apache/parquet-format `apache-parquet-format-2.14.0`](https://github.com/apache/parquet-format/tree/apache-parquet-format-2.14.0).
References are section anchors of the Markdown specs and line numbers of
`src/main/thrift/parquet.thrift` at that tag, so they don't move.

Every applicable assertion has an id and one test in
`packages/effect/test/encoding/Parquet.test.ts`, under
`conformance (apache-parquet-format-2.14.0)`, whose name starts with the id.
The pyarrow fixtures in this directory are interoperability evidence on top of
these tests, not a replacement for them.

This is not a claim of full conformance: the sections below list what the
reader rejects, what it doesn't read yet, and what applies only to writers.

## Tested

| Id          | Reference                                                                  | Assertion                                                                               |
| ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| PQ-FILE-1   | README.md#file-format                                                      | A file starts and ends with the magic number `PAR1`                                     |
| PQ-FILE-2   | README.md#file-format                                                      | The metadata is found from the 4-byte little-endian length before the final magic       |
| PQ-META-1   | parquet.thrift L1411-1413                                                  | Readers should accept versions 1 and 2 interchangeably                                  |
| PQ-META-2   | parquet.thrift L1440-1455                                                  | `column_orders` has one entry per leaf column, in schema order                          |
| PQ-SCHEMA-1 | parquet.thrift L535-537                                                    | Every schema node but the root has a repetition                                         |
| PQ-SCHEMA-2 | parquet.thrift L518-523, L542-547                                          | The schema tree is the depth-first list of elements, groups giving `num_children`       |
| PQ-NEST-1   | README.md#nested-encoding                                                  | Maximum levels follow from the optional and repeated nodes of the path                  |
| PQ-NEST-2   | README.md#nested-encoding                                                  | Repetition and definition levels encode lists (Dremel)                                  |
| PQ-NULL-1   | README.md#nulls                                                            | Nulls are encoded in the definition levels only, not in the data                        |
| PQ-PAGE-1   | README.md#data-pages                                                       | A required, non-nested column's page holds only the values                              |
| PQ-PAGE-2   | README.md#data-pages                                                       | `uncompressed_page_size` covers levels and values together                              |
| PQ-CHUNK-1  | README.md#column-chunks, parquet.thrift L727-729                           | The dictionary page comes first, and there is at most one                               |
| PQ-CHUNK-2  | README.md#column-chunks                                                    | Readers can skip pages they don't read (index pages, later page types)                  |
| PQ-V2-1     | parquet.thrift L759-761                                                    | Every v2 data page begins at a row boundary                                             |
| PQ-V2-2     | parquet.thrift L744-745, L767                                              | v2 levels are uncompressed RLE without a length prefix                                  |
| PQ-V2-3     | parquet.thrift L745, L779                                                  | v2 values are compressed only when `is_compressed` is true                              |
| PQ-V2-4     | parquet.thrift L755-756                                                    | A v2 page holds `num_values - num_nulls` values                                         |
| PQ-STATS-1  | parquet.thrift L286-289                                                    | Readers must distinguish an absent `null_count` from 0                                  |
| PQ-STATS-2  | parquet.thrift L315-316                                                    | Readers must not assume `nan_count` is 0 when absent                                    |
| PQ-PLAIN-1  | Encodings.md#plain-plain--0                                                | PLAIN encoding of every physical type                                                   |
| PQ-DICT-1   | Encodings.md#dictionary-encoding-plain_dictionary--2-and-rle_dictionary--8 | Indices are a bit-width byte (at most 32) and RLE/bit-packed runs                       |
| PQ-DICT-2   | Encodings.md#dictionary-encoding-plain_dictionary--2-and-rle_dictionary--8 | The deprecated `PLAIN_DICTIONARY` is still read                                         |
| PQ-RLE-1    | Encodings.md#run-length-encoding--bit-packing-hybrid-rle--3, note 1        | Bit-packed runs are packed from the least significant bit                               |
| PQ-RLE-2    | Encodings.md#run-length-encoding--bit-packing-hybrid-rle--3, note 3        | Run lengths are at least 1                                                              |
| PQ-RLE-3    | Encodings.md#run-length-encoding--bit-packing-hybrid-rle--3, length table  | RLE booleans carry a 4-byte length in v1 and v2 pages                                   |
| PQ-BP-1     | Encodings.md#bit-packed-deprecated-bit_packed--4, L182-195                 | `BIT_PACKED` levels are packed from the most significant bit                            |
| PQ-BP-2     | Encodings.md#bit-packed-deprecated-bit_packed--4, L197-198                 | `BIT_PACKED` is only for levels                                                         |
| PQ-DELTA-1  | Encodings.md#delta-encoding-delta_binary_packed--5, examples 1 and 2       | Header, blocks and miniblocks                                                           |
| PQ-DELTA-2  | Encodings.md#delta-encoding-delta_binary_packed--5                         | Readers must accept arbitrary padding bits                                              |
| PQ-DELTA-3  | Encodings.md#delta-encoding-delta_binary_packed--5                         | Readers must accept arbitrary bit widths of unneeded miniblocks                         |
| PQ-DELTA-4  | Encodings.md#delta-encoding-delta_binary_packed--5                         | Deltas wrap around in two's complement                                                  |
| PQ-DELTA-5  | Encodings.md#delta-encoding-delta_binary_packed--5                         | Miniblocks are no wider than the physical type (rejected when they are)                 |
| PQ-DLBA-1   | Encodings.md#delta-length-byte-array-delta_length_byte_array--6            | Delta-encoded lengths, then the concatenated bytes                                      |
| PQ-DBA-1    | Encodings.md#delta-strings-delta_byte_array--7                             | Prefix lengths, then suffixes as `DELTA_LENGTH_BYTE_ARRAY`                              |
| PQ-DBA-2    | Encodings.md#delta-strings-delta_byte_array--7                             | `FIXED_LEN_BYTE_ARRAY` values encode all their lengths                                  |
| PQ-BSS-1    | Encodings.md#byte-stream-split-byte_stream_split--9                        | Byte k of every value is in stream k                                                    |
| PQ-BSS-2    | Encodings.md#byte-stream-split-byte_stream_split--9                        | The streams are exactly K * N bytes, with no padding                                    |
| PQ-COMP-1   | Compression.md#codecs                                                      | Pages are decompressed with the column chunk's codec                                    |
| PQ-COMP-2   | Compression.md#gzip                                                        | Readers should read GZIP pages with several members (through the supplied `Decompress`) |

## Unsupported: fails with `Unsupported`

| Id         | Reference                                             | Feature                                                                                                                                                           |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PQ-UNSUP-1 | Encryption.md                                         | Files with an encrypted footer (`PARE`)                                                                                                                           |
| PQ-UNSUP-2 | Encryption.md, parquet.thrift ColumnChunk fields 8-9  | Encrypted column chunks                                                                                                                                           |
| PQ-UNSUP-3 | Encodings.md#adaptive-lossless-floating-point-alp--10 | The `ALP` encoding (in preview at 2.14.0)                                                                                                                         |
| PQ-UNSUP-4 | parquet.thrift ColumnChunk.file_path                  | Column chunks in another file                                                                                                                                     |
| PQ-UNSUP-5 | Compression.md#codecs                                 | Every codec but `UNCOMPRESSED` without a `Decompress`, and unknown codecs. The module has no codecs; the shared ones are planned in `effect/encoding/Compression` |

## Deferred: not read yet

- Page index: `ColumnIndex` and `OffsetIndex` (PageIndex.md, parquet.thrift L1235-1373). The reader reads every page in order.
- Bloom filters (BloomFilter.md).
- Page checksums (README.md#checksumming). `crc` is skipped, not verified.
- Statistics semantics (parquet.thrift L1100-1219): sort orders, NaN rules and exactness are exposed as written, not interpreted. Size and geospatial statistics are skipped.
- Logical types (LogicalTypes.md): annotations are decoded into the schema, values stay in their physical type. This includes the LIST and MAP backward-compatibility rules, Variant and Geometry.
- Error recovery (README.md#error-recovery): each `readColumn` call is independent, so a corrupt column chunk doesn't affect the others, but nothing inside a chunk is recovered.
- Binary protocol extensions (BinaryProtocolExtensions.md).

## Not applicable: writer obligations

- Writing in general: this module only reads.
- parquet.thrift L286 and L1338: writers should always write `null_count` and `null_counts`.
- parquet.thrift L1411-1413: writers should write version 1.
- Encodings.md#delta-encoding-delta_binary_packed--5: padding and unused bit widths should be zero; the reader side is PQ-DELTA-2 and PQ-DELTA-3.
- Encodings.md#run-length-encoding--bit-packing-hybrid-rle--3, note 3: writers must not emit runs longer than 2^31 - 1. The reader keeps the stricter 32-bit run header limit.
- README.md#configurations, and the dictionary fallback in Encodings.md#dictionary-encoding-plain_dictionary--2-and-rle_dictionary--8.
- parquet.thrift L36: new writers should not write INT96. The reader still reads it (pyarrow fixture `int96.parquet`).

## Resource limits

The limits (`maxFooterLength`, `maxDepth`, `maxPageSize`, `maxValues`,
`maxBinaryLength`) aren't spec requirements. Their tests are under
`hostile input`, with the other rejections of malformed input.
