# Arrow assertion reference

This is a maintainer inventory for the tests in this directory, not a claim of
complete Arrow conformance. Stable IDs in the tests identify the assertions below.
Tests remain in their conventional files; there is no separate conformance runner.

## Sources

The authoritative reference is Apache Arrow **Columnar Format 1.5**, pinned to
commit **ee4d09ebef61c663c1efbfa4c18e518a03b798be** (the peeled commit of
apache-arrow-21.0.0):

- [Columnar.rst](https://github.com/apache/arrow/blob/ee4d09ebef61c663c1efbfa4c18e518a03b798be/docs/source/format/Columnar.rst): Physical Memory Layout,
  Validity bitmaps, Fixed-size Primitive Layout, Union Layout, Dictionary-encoded
  Layout, Encapsulated message format, Streaming Format, IPC File Format, and
  Dictionary Messages.
- [Schema.fbs](https://github.com/apache/arrow/blob/ee4d09ebef61c663c1efbfa4c18e518a03b798be/format/Schema.fbs): MetadataVersion, Union, integer and
  temporal widths, dictionary encoding, field metadata and endianness.
- [Message.fbs](https://github.com/apache/arrow/blob/ee4d09ebef61c663c1efbfa4c18e518a03b798be/format/Message.fbs): FieldNode, RecordBatch buffers,
  DictionaryBatch.isDelta, Message and body compression.
- [File.fbs](https://github.com/apache/arrow/blob/ee4d09ebef61c663c1efbfa4c18e518a03b798be/format/File.fbs): Footer and Block.

Classification:

- **N**: a narrow normative assertion against the pinned format.
- **I**: interoperability evidence from checked-in pyarrow-produced bytes. It
  supports the listed layouts but does not prove every legal representation.
- **L**: local API, error-reporting, robustness or round-trip policy; not an Arrow
  requirement. Mixed rows separate the format constraint from its local handling.

## IPC assertion map

All test names in this table are in **ArrowIpc.test.ts**. The parameterized names
expand once for **stream** and once for **file**.

| ID            | Exact test name                                                                                                              | Assertions and source scope                                                                                                                                                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARROW-IPC-001 | decodes a pyarrow stream; decodes a pyarrow file                                                                             | **I**: exact schema (including metadata), batch lengths [3, 2], and every value in the named columns fixture inventory. Columnar layouts, Message/Schema/File schemas.                                                                                                                                                                        |
| ARROW-IPC-002 | decodes a re-encoded stream to the same rows, also when sliced; decodes a re-encoded file to the same rows, also when sliced | **L**: schema, values and batch lengths survive self-round-trip, including slice starting at row 1 with lengths [2, 2]. Not an independent writer oracle.                                                                                                                                                                                     |
| ARROW-IPC-003 | decode and encode stream batches across arbitrary chunks                                                                     | **L**: chunk sizes 1, 13 and 1000 preserve fixture values and schema through channels; empty batch input still emits a decodable schema-only stream.                                                                                                                                                                                          |
| ARROW-IPC-004 | rejects malformed and truncated input with an ArrowIpcError                                                                  | **N**: invalid metadata root and incomplete file/message bytes cannot form complete IPC input (Encapsulated message format, IPC File Format). **L**: Invalid error, FlatBuffers OutOfBounds cause, and shared-field schema expansion budget. Successful stream prefixes check only batch lengths, not an exhaustive list of legal boundaries. |
| ARROW-IPC-005 | appends delta dictionaries to the slots each side uses                                                                       | **I**: exact two-row values for utf8, largeBinary, list and fixedSizeList deltas with nonzero offsets and unused child values. Dictionary Messages and Message.fbs isDelta append semantics.                                                                                                                                                  |
| ARROW-IPC-006 | rejects invalid metadata lengths, file magic and footer lengths                                                              | **N**: metadata length -2 or unavailable 2147483647, independently damaged leading/trailing ARROW1, and footer lengths -1, 0 or the entire file size are rejected. Encapsulated message format / IPC File Format. **L**: Invalid kind through whole-buffer and chunked stream readers.                                                        |
| ARROW-IPC-007 | rejects union type ids that are not unique or not in 0..127                                                                  | **N**: tested duplicate [5, 5] and out-of-range [5, 128] union ids rejected on decode and both writers; Union Layout / Schema.fbs Union mapping. **L**: Invalid classification. No claim that all union-id boundary cases are tested.                                                                                                         |
| ARROW-IPC-008 | does not write unions with null slots of their own                                                                           | **N**: V5 unions have no top-level validity bitmap (Schema.fbs MetadataVersion). **L**: reading a constructed legacy-shaped column returns null, but both writers refuse it as Unsupported rather than silently losing nullness.                                                                                                              |
| ARROW-IPC-009 | decode fails with an ArrowIpcError when the input ends inside a message or holds no schema                                   | **N**: incomplete message and schema-less stream are not complete streams (Streaming Format). **L**: channel failure has Invalid kind.                                                                                                                                                                                                        |

| ARROW-IPC-010 | rejects big-endian schema metadata with BigEndian | **L**: Schema.fbs Endianness flag is rejected with BigEndian by whole-buffer and chunked stream readers; little-endian empty-schema control succeeds. Tests metadata classification, not endian conversion or file decoding. |
| ARROW-IPC-011 | rejects LZ4 and ZSTD batch compression metadata with Compression | **L**: Message.fbs BodyCompression codec flags 0 (LZ4_FRAME) and 1 (ZSTD) on zero-row batches are rejected with Compression by whole-buffer and chunked stream readers; uncompressed control yields one zero-row batch. No compressed payload or file decoding is tested. |
| ARROW-IPC-012 | rejects a record batch before its schema | **N**: Columnar Streaming Format requires a schema before record batches; a zero-row batch followed by a schema is rejected. **L**: Invalid kind in whole-buffer and chunked stream readers. |

The IPC fixture column inventory covers null, bool, signed/unsigned integer widths
8–64, float32/64, decimal128, date32/64, time32/64 units, zoned and nanosecond
timestamps, duration, month-day-nanosecond interval, binary/utf8 and large/view
variants, fixed binary, list/large list/list view/fixed list, struct, map,
sparse/dense unions, run-end encoding, and dictionary encoding. The exact values
and types are the named entries of the test's columns array. This is positive
layout interoperability evidence, not byte-level validation of each buffer rule.

Fixtures and their generator live in test/fixtures/arrow. The existing generator
uses an unpinned pyarrow dependency and patches the delta fixture after writing;
these fixtures are not an official upstream conformance corpus. They were not
regenerated for this mapping. The specification pin above does not pin their
producer version. Writer verification by an independent implementation is deferred.

## Column and table assertion map

| ID               | File / exact test name                                                                                | Assertions and source scope                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARROW-LAYOUT-001 | ArrowColumn.test.ts / reads the specification int32 bitmap example with nonzero masked bytes          | **N**: literal Columnar Fixed-size Primitive Layout example [1, null, 2, 4, 8], bitmap 0x1d (LSB-first), nonzero masked bytes ignored, and optional bitmap when null count is zero. **L**: slicing that data at slots 1..4 reads [null, 2, 4]. The expected bytes/values are independent of the builder. |
| ARROW-COLUMN-001 | ArrowColumn.test.ts / fromValues builds every type family and reads the values back                   | **L**: exact cases-array values, lengths, JS numeric/temporal conversions, sparse inputs, nesting, dictionary/run equality and one-shot extension values. Covers additional decimal32/256 and largeListView construction. Self-round-trip alone does not establish physical layout conformance.          |
| ARROW-COLUMN-002 | ArrowColumn.test.ts / fromValues fails with an ArrowBuildError locating a value that does not fit     | **N**: selected width, nullability, fixed-size, union and map-key constraints from Schema.fbs/Columnar. **L**: accepted JS input kinds, decimal conversion rules, ArrowBuildError classification and exact paths for every rejections-array case. Does not exercise malformed IPC buffers.               |
| ARROW-COLUMN-003 | ArrowColumn.test.ts / extensions encode values when building and decode them when reading             | **L**: callbacks receive metadata and convert values; without extension registration storage values are exposed. Not a test of registered extension-type semantics or wire metadata serialization.                                                                                                       |
| ARROW-TABLE-001  | ArrowTable.test.ts / fromRows splits rows into batches that toRows reads back                         | **L**: batch lengths, row count, missing fields to null, iterator values and shared dictionary object identity. Arrow does not require this JS identity or batching policy.                                                                                                                              |
| ARROW-TABLE-002  | ArrowTable.test.ts / fromColumns and fromBatches build one batch per entry, by field name or position | **L**: named/positional construction, lengths and rows.                                                                                                                                                                                                                                                  |
| ARROW-TABLE-003  | ArrowTable.test.ts / build errors locate the value across batches                                     | **L**: missing/mismatched columns, nested invalid values, invalid union schema and exact cross-batch error paths.                                                                                                                                                                                        |
| ARROW-TABLE-004  | ArrowTable.test.ts / reads and builds a field named **proto** as an own property                      | **L**: JS prototype safety, own keys and missing nested values.                                                                                                                                                                                                                                          |
| ARROW-TABLE-005  | ArrowTable.test.ts / column reads one field across batches, by name or position                       | **L**: field identity, iteration, indexed reads, absent column/index Option and unsafe RangeError behavior.                                                                                                                                                                                              |
| ARROW-TABLE-006  | ArrowTable.test.ts / slice keeps rows start until end across batches                                  | **L**: batch lengths, row counts, values, repeated slices and invalid bounds.                                                                                                                                                                                                                            |

## Exclusions and actual gaps

- **Unsupported by the implementation:** big-endian IPC bodies and compressed
  record batches (LZ4/ZSTD). ARROW-IPC-010/011 assert the BigEndian and Compression
  error kinds for stream metadata; file paths and actual compressed payloads remain
  untested. Legacy unions with
  their own validity cannot be written (ARROW-IPC-008).
- **Malformed-layout coverage gaps:** no focused IPC cases here for descending or
  out-of-range variable offsets, short validity/value buffers, dictionary index
  bounds, view buffer indices/prefixes, run-end monotonicity, or mismatched
  FieldNode/buffer counts. Generic truncation is not a substitute for these.
- **IPC semantic gaps:** schema-before-record-batch ordering is covered by
  ARROW-IPC-012, but repeated schemas, dictionary-before-schema ordering,
  missing dictionary definitions, dictionary replacement restrictions in files,
  footer block overlap, alignment violations, explicit EOS bytes, metadata-version
  compatibility, and legacy four-byte framing remain untested. Existing positive fixtures and
  round-trips do not independently establish these properties.
- **Physical-layout gaps:** most layouts have positive fixture coverage but no
  independent literal-byte oracle. Only the int32 validity example above adds
  one; builder self-round-trips must not be counted as independent validation.
- **Outside this layer:** Flight, C Data Interface, device interfaces, compute
  semantics, registered extension specifications, performance and zero-copy
  guarantees. This reference does not certify those protocols or APIs.

## Validation

Run from the repository root after dependency installation:

    nix develop -c pnpm test --run packages/effect/test/arrow/ArrowColumn.test.ts packages/effect/test/arrow/ArrowIpc.test.ts packages/effect/test/arrow/ArrowTable.test.ts

This runs 24 tests, including both stream/file parameterizations. Use the root
pnpm check for type checking and scope formatting/linting to changed files when
working concurrently. No source or fixture changes are required by this inventory.
