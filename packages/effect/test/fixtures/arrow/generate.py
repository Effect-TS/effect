"""Writes the Arrow IPC fixtures decoded by `test/arrow/ArrowIpc.test.ts`.

Rerun from the repository root after changing it:

    uv run --with pyarrow python packages/effect/test/fixtures/arrow/generate.py

It writes, next to this file:

- `types.arrows`: an IPC stream with two record batches (3 and 2 rows). The
  second batch's `dictionary` column adds a value, which is written as a
  dictionary delta. Every other column is one array split in two, so the
  second batch comes from sliced (non-zero offset) arrays.
- `types.arrow`: the same rows as an IPC file, with one unified dictionary.
"""

import datetime
import decimal
import pathlib

import pyarrow as pa

here = pathlib.Path(__file__).parent

# One array of 5 values per column; rows 0..2 go to the first batch, 3..4 to the second.
columns = {
    "null": pa.nulls(5),
    "bool": pa.array([True, None, False, True, False]),
    "int8": pa.array([-128, None, 0, 1, 127], pa.int8()),
    "uint8": pa.array([0, 255, None, 1, 2], pa.uint8()),
    "int16": pa.array([-32768, 32767, None, 0, -1], pa.int16()),
    "uint16": pa.array([65535, None, 0, 1, 2], pa.uint16()),
    "int32": pa.array([-(2**31), None, 2**31 - 1, 0, 7], pa.int32()),
    "uint32": pa.array([2**32 - 1, 0, None, 1, 2], pa.uint32()),
    "int64": pa.array([-(2**63), None, 2**63 - 1, 0, 42], pa.int64()),
    "uint64": pa.array([2**64 - 1, 0, None, 1, 2], pa.uint64()),
    "float32": pa.array([1.5, None, -0.25, 0.0, 1024.0], pa.float32()),
    "float64": pa.array([0.1, -2.5, None, 1e300, 3.0], pa.float64()),
    "decimal128": pa.array(
        [decimal.Decimal("123.45"), decimal.Decimal("-0.01"), None, decimal.Decimal("99999999.99"), decimal.Decimal("0.00")],
        pa.decimal128(10, 2),
    ),
    "date32": pa.array([datetime.date(2024, 1, 2), None, datetime.date(1969, 12, 31), datetime.date(1970, 1, 1), datetime.date(2000, 2, 29)], pa.date32()),
    "date64": pa.array([86_400_000, None, -86_400_000, 0, 951_782_400_000], pa.date64()),
    "time32s": pa.array([0, 3661, None, 86399, 1], pa.time32("s")),
    "time32ms": pa.array([0, 3_661_001, None, 86_399_999, 1], pa.time32("ms")),
    "time64us": pa.array([0, 3_661_000_001, None, 86_399_999_999, 1], pa.time64("us")),
    "time64ns": pa.array([0, 3_661_000_000_001, None, 86_399_999_999_999, 1], pa.time64("ns")),
    # 2024-01-02T03:04:05.678Z and neighbours, in a named zone.
    "timestampTz": pa.array([1_704_164_645_678, None, 0, -1, 1], pa.timestamp("ms", tz="Asia/Tokyo")),
    # Sub-millisecond precision is rounded down, also before the epoch.
    "timestampNs": pa.array([1_704_164_645_678_901_234, -1, None, 0, 999_999], pa.timestamp("ns")),
    "durationUs": pa.array([1_500_000, -1, None, 0, 2**63 - 1], pa.duration("us")),
    "interval": pa.array(
        [pa.MonthDayNano([1, 2, 3]), None, pa.MonthDayNano([-1, -2, -3]), pa.MonthDayNano([0, 0, 0]), pa.MonthDayNano([12, 31, 86_400_000_000_000])],
        pa.month_day_nano_interval(),
    ),
    "utf8": pa.array(["a", None, "", "héllo", "x"], pa.utf8()),
    "largeUtf8": pa.array(["b", "", None, "日本", "y"], pa.large_utf8()),
    "utf8View": pa.array(["short", None, "a string longer than twelve bytes", "", "z"], pa.string_view()),
    "binary": pa.array([b"\x00\x01", None, b"", b"\xff", b"ab"], pa.binary()),
    "largeBinary": pa.array([b"", b"\x02", None, b"cd", b"e"], pa.large_binary()),
    "fixedBinary": pa.array([b"abc", None, b"\x00\x00\x00", b"xyz", b"123"], pa.binary(3)),
    "binaryView": pa.array([b"tiny", None, b"more than twelve bytes!", b"", b"q"], pa.binary_view()),
    "list": pa.array([[1, 2], None, [], [None, 3], [4]], pa.list_(pa.int32())),
    "largeList": pa.array([["a"], [], None, ["b", None], ["c", "d"]], pa.large_list(pa.utf8())),
    "listView": pa.array([[1], [2, 3], None, [], [4, 5, 6]], pa.list_view(pa.int32())),
    "fixedList": pa.array([[1, 2], None, [3, None], [5, 6], [7, 8]], pa.list_(pa.int16(), 2)),
    "struct": pa.array(
        [{"a": 1, "b": "x"}, None, {"a": None, "b": "y"}, {"a": 4, "b": None}, {"a": 5, "b": "z"}],
        pa.struct([("a", pa.int32()), ("b", pa.utf8())]),
    ),
    "map": pa.array([[("k", 1), ("l", None)], None, [], [("m", 3)], [("n", 4), ("o", 5)]], pa.map_(pa.utf8(), pa.int32())),
    "sparseUnion": pa.UnionArray.from_sparse(
        pa.array([0, 1, 0, 1, 1], pa.int8()),
        [pa.array([10, 11, 12, 13, 14], pa.int32()), pa.array(["p", "q", "r", "s", "t"])],
        ["int", "str"],
    ),
    "denseUnion": pa.UnionArray.from_dense(
        pa.array([5, 10, 10, 5, 10], pa.int8()),
        pa.array([0, 0, 1, 1, 2], pa.int32()),
        [pa.array([1.5, 2.5], pa.float64()), pa.array([True, False, True])],
        ["float", "bool"],
        [5, 10],
    ),
    "runEnd": pa.RunEndEncodedArray.from_arrays(pa.array([2, 3, 5], pa.int32()), pa.array(["r", None, "s"])),
}

dictionary_type = pa.dictionary(pa.int8(), pa.utf8())
dictionaries = [
    pa.DictionaryArray.from_arrays(pa.array([0, 1, None], pa.int8()), pa.array(["a", "b"])),
    # Extends the first dictionary, so the stream writer emits a delta with "c".
    pa.DictionaryArray.from_arrays(pa.array([2, 0], pa.int8()), pa.array(["a", "b", "c"])),
]

schema = pa.schema(
    [pa.field(name, array.type) for name, array in columns.items()] + [pa.field("dictionary", dictionary_type)],
    metadata={"source": "pyarrow"},
)
batches = [
    pa.record_batch([array.slice(start, length) for array in columns.values()] + [dictionaries[i]], schema=schema)
    for i, (start, length) in enumerate([(0, 3), (3, 2)])
]

with pa.ipc.new_stream(here / "types.arrows", schema, options=pa.ipc.IpcWriteOptions(emit_dictionary_deltas=True)) as writer:
    for batch in batches:
        writer.write_batch(batch)

with pa.ipc.new_file(here / "types.arrow", schema, options=pa.ipc.IpcWriteOptions(unify_dictionaries=True)) as writer:
    writer.write_table(pa.Table.from_batches(batches))
