"""
Generates the Parquet fixtures read by the effect Parquet reader tests, and
gold.json: for every file, its row groups (row count, codec and encodings of
each column chunk) and its leaf columns (schema facts and the stored value of
every row). README.md describes the files and how to regenerate them.

A leaf value is the row's value projected onto the leaf path: a struct takes
one path component, a list or map two ("list", "element" / "key_value",
"key" | "value") and maps over its items, and a null anywhere is null. Leaf
scalars are encoded by Parquet physical type:
  BOOLEAN                          true / false
  INT32, FLOAT, DOUBLE             number
  INT64                            decimal string
  BYTE_ARRAY, FIXED_LEN_BYTE_ARRAY hex of the stored bytes
  INT96                            hex of the 12 stored bytes
Gold values come from the source data below, not from reading the files back;
every file is also read back with pyarrow and compared to its source table.
"""

import json
import random
import struct
from decimal import Decimal
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

HERE = Path(__file__).parent
I32_MIN, I32_MAX = -(2**31), 2**31 - 1
I64_MIN, I64_MAX = -(2**63), 2**63 - 1
NS_PER_DAY = 86_400 * 10**9
JULIAN_UNIX_EPOCH = 2_440_588

rng = random.Random(0x9A4E)


def nulls(values, every, offset=0):
    return [None if (i + offset) % every == 0 else v for i, v in enumerate(values)]


def f32(x):
    return struct.unpack("<f", struct.pack("<f", x))[0]


# --- gold values --------------------------------------------------------------


def leaf(v, t, column):
    if v is None:
        return None
    physical = column.physical_type
    if pa.types.is_decimal(t):
        unscaled = int(v.scaleb(t.scale))
        if physical == "FIXED_LEN_BYTE_ARRAY":
            return unscaled.to_bytes(column.length, "big", signed=True).hex()
        return unscaled if physical == "INT32" else str(unscaled)
    if physical == "BOOLEAN":
        return v
    if physical == "INT32":
        return v
    if physical == "INT64":
        return str(v)
    if physical == "FLOAT":
        return f32(v)
    if physical == "DOUBLE":
        return v
    if physical == "INT96":
        days, nanos = divmod(v, NS_PER_DAY)
        return struct.pack("<QI", nanos, days + JULIAN_UNIX_EPOCH).hex()
    return (v.encode("utf-8") if isinstance(v, str) else v).hex()


def project(v, t, path, column):
    if v is None or not path:
        return leaf(v, t, column)
    if pa.types.is_struct(t):
        return project(v[path[0]], t.field(path[0]).type, path[1:], column)
    if pa.types.is_map(t):
        assert path[0] == "key_value"
        if path[1] == "key":
            return [project(k, t.key_type, path[2:], column) for k, _ in v]
        return [project(x, t.item_type, path[2:], column) for _, x in v]
    assert pa.types.is_list(t) and path[:2] == ["list", "element"], path
    return [project(e, t.value_type, path[2:], column) for e in v]


LOGICAL_TYPES = {
    "String": "STRING", "Enum": "ENUM", "UUID": "UUID", "Date": "DATE", "JSON": "JSON",
    "BSON": "BSON", "Float16": "FLOAT16", "Null": "UNKNOWN",
}
TIME_UNITS = {"milliseconds": "MILLIS", "microseconds": "MICROS", "nanoseconds": "NANOS"}


def logical_type(column):
    lt = json.loads(column.logical_type.to_json())
    kind = lt["Type"]
    if kind == "None":
        return None
    if kind in LOGICAL_TYPES:
        return {"type": LOGICAL_TYPES[kind]}
    if kind == "Decimal":
        return {"type": "DECIMAL", "scale": lt["scale"], "precision": lt["precision"]}
    if kind in ("Time", "Timestamp"):
        return {"type": kind.upper(), "isAdjustedToUTC": lt["isAdjustedToUTC"], "unit": TIME_UNITS[lt["timeUnit"]]}
    if kind == "Int":
        return {"type": "INTEGER", "bitWidth": lt["bitWidth"], "isSigned": lt["isSigned"]}
    raise ValueError(lt)


files = []


def write(name, data, schema, **options):
    """Writes the table built from `data` (column name -> python values)."""
    table = pa.table({f.name: pa.array(data[f.name], f.type) for f in schema}, schema=schema)
    path = HERE / name
    pq.write_table(table, path, write_batch_size=8, **options)
    assert pq.read_table(path).equals(table), name

    meta = pq.ParquetFile(path).metadata
    row_groups = []
    for i in range(meta.num_row_groups):
        rg = meta.row_group(i)
        row_groups.append({
            "numRows": rg.num_rows,
            "columns": [
                {"codec": rg.column(j).compression, "encodings": sorted(set(rg.column(j).encodings))}
                for j in range(rg.num_columns)
            ],
        })
    columns = []
    for i in range(meta.num_columns):
        column = meta.schema.column(i)
        top, *rest = column.path.split(".")
        t = schema.field(top).type
        columns.append({
            "path": [top, *rest],
            "physicalType": column.physical_type,
            "typeLength": column.length if column.physical_type == "FIXED_LEN_BYTE_ARRAY" else None,
            "maxDefinitionLevel": column.max_definition_level,
            "maxRepetitionLevel": column.max_repetition_level,
            "convertedType": None if column.converted_type == "NONE" else column.converted_type,
            "logicalType": logical_type(column),
            "values": [project(v, t, rest, column) for v in data[top]],
        })
    files.append({"name": name, "numRows": meta.num_rows, "rowGroups": row_groups, "columns": columns})


# --- plain.parquet: one flat column per physical / logical type ---------------

N = 40
STRINGS = ["", "a", "hello", "héllo wörld", "日本語", "🌍", "parquet", "x" * 20]
plain = {
    "bool": nulls([i % 3 == 0 for i in range(N)], 7),
    "int32": [I32_MIN, I32_MAX, 0, -1] + [rng.randint(-10**6, 10**6) for _ in range(N - 4)],
    "int64": nulls([I64_MIN, I64_MAX, 0, -1] + [rng.randint(-2**40, 2**40) for _ in range(N - 4)], 9, 5),
    "float32": nulls([f32(rng.uniform(-1e3, 1e3)) for _ in range(N)], 8, 3),
    "float64": nulls([rng.uniform(-1e9, 1e9) for _ in range(N - 2)] + [5e-324, 1.7976931348623157e308], 6, 2),
    "string": nulls([STRINGS[i % len(STRINGS)] for i in range(N)], 11, 10),
    "binary": nulls([bytes(rng.getrandbits(8) for _ in range(i % 6)) for i in range(N)], 5, 4),
    "fixed_size_binary": nulls([struct.pack(">I", rng.getrandbits(32)) for _ in range(N)], 7, 1),
    "int8": nulls([(-128, 127, 0)[i % 3] if i < 3 else rng.randint(-128, 127) for i in range(N)], 10, 6),
    "uint16": nulls([65535 if i == 0 else rng.randint(0, 65535) for i in range(N)], 9),
    "date32": nulls([rng.randint(-50_000, 50_000) for _ in range(N)], 8, 4),
    "timestamp_ms_utc": nulls([rng.randint(-2**41, 2**41) for _ in range(N)], 7, 2),
    "time64_us": nulls([rng.randint(0, 86_400 * 10**6 - 1) for _ in range(N)], 6),
    "decimal": nulls([Decimal(rng.randint(-(10**9) + 1, 10**9 - 1)).scaleb(-2) for _ in range(N)], 5, 3),
}
PLAIN_SCHEMA = pa.schema([
    ("bool", pa.bool_()),
    pa.field("int32", pa.int32(), nullable=False),
    ("int64", pa.int64()),
    ("float32", pa.float32()),
    ("float64", pa.float64()),
    ("string", pa.string()),
    ("binary", pa.binary()),
    ("fixed_size_binary", pa.binary(4)),
    ("int8", pa.int8()),
    ("uint16", pa.uint16()),
    ("date32", pa.date32()),
    ("timestamp_ms_utc", pa.timestamp("ms", tz="UTC")),
    ("time64_us", pa.time64("us")),
    ("decimal", pa.decimal128(9, 2)),
])
FLAT = dict(
    compression="NONE", data_page_version="1.0", use_dictionary=False, row_group_size=25, data_page_size=64
)
write("plain.parquet", plain, PLAIN_SCHEMA, **FLAT)

# use_deprecated_int96_timestamps applies to every timestamp column of a file.
int96 = {"timestamp_ns": nulls([I64_MIN + 1, I64_MAX, 0, -1, NS_PER_DAY - 1, -NS_PER_DAY] +
                              [rng.randint(-2**62, 2**62) for _ in range(N - 6)], 9, 7)}
write("int96.parquet", int96, pa.schema([("timestamp_ns", pa.timestamp("ns"))]),
      use_deprecated_int96_timestamps=True, **FLAT)

# --- dictionary.parquet -------------------------------------------------------

dictionary = {
    "int32": nulls([(7, -3, I32_MAX)[i % 3] for i in range(N)], 5),
    "int64": nulls([(I64_MIN, 42)[i % 4 // 3] for i in range(N)], 6, 1),
    "float64": nulls([(0.5, -1.25, 3e10)[rng.randint(0, 2)] for _ in range(N)], 7, 2),
    "string": nulls([("red", "green", "blue", "")[rng.randint(0, 3)] for _ in range(N)], 4, 3),
    "fixed_size_binary": nulls([(b"\x00\x01\x02\x03", b"abcd")[i % 2] for i in range(N)], 8, 4),
}
write("dictionary.parquet", dictionary, pa.schema([
    ("int32", pa.int32()),
    ("int64", pa.int64()),
    ("float64", pa.float64()),
    ("string", pa.string()),
    ("fixed_size_binary", pa.binary(4)),
]), compression="NONE", data_page_version="2.0", use_dictionary=True, row_group_size=25, data_page_size=128)

# --- encodings.parquet / encodings_v2.parquet ---------------------------------

# Delta pages are cut only between 128-value blocks, so each delta column is
# one page of 160 values: a full block and a partial one.
M = 160
WORDS = ["axis", "axle", "axolotl", "babble", "baby", "babyhood", "back", "backbone", "bad", "cab", "cabin"]


def walk(extremes):
    values = [rng.randint(-1000, 1000)]
    while len(values) < M:
        values.append(values[-1] + rng.randint(-50, 60))
    values[100:100] = extremes  # adjacent extremes give wrapping deltas
    return values[:M]


encodings = {
    "delta_int32": walk([I32_MIN, I32_MAX, I32_MIN, I32_MAX, 0]),
    "delta_int64": nulls(walk([I64_MAX, I64_MIN, I64_MAX, 0, I64_MIN]), 13, 5),
    "delta_length_string": nulls(["".join(rng.choice("abcé日 ") for _ in range(rng.randint(0, 5)))
                                  for _ in range(M)], 17),
    "delta_string": nulls([WORDS[i * 3 % len(WORDS)] + ("" if i % 4 else str(i)) for i in range(M)], 19, 3),
    "delta_fixed_size_binary": [b"ab" + bytes([i % 7]) if i % 3 else bytes([i % 256, 0, 1]) for i in range(M)],
    "bss_float32": nulls([rng.randint(-10**4, 10**4) / 16 for _ in range(M)], 11, 2),
    "bss_float64": nulls([rng.randint(-10**6, 10**6) / 1024 for _ in range(M)], 7, 3),
    "bss_int32": [I32_MIN, I32_MAX] + [rng.randint(-10**5, 10**5) for _ in range(M - 2)],
    "bss_int64": nulls([I64_MIN, I64_MAX] + [rng.randint(-2**40, 2**40) for _ in range(M - 2)], 23, 9),
    "bss_fixed_size_binary": nulls([bytes(rng.getrandbits(8) for _ in range(3)) for _ in range(M)], 29, 4),
    "rle_bool": nulls([i % 10 < 7 for i in range(M)], 31, 6),
}
ENCODINGS_SCHEMA = pa.schema([
    pa.field("delta_int32", pa.int32(), nullable=False),
    ("delta_int64", pa.int64()),
    ("delta_length_string", pa.string()),
    ("delta_string", pa.string()),
    ("delta_fixed_size_binary", pa.binary(3)),
    ("bss_float32", pa.float32()),
    ("bss_float64", pa.float64()),
    ("bss_int32", pa.int32()),
    ("bss_int64", pa.int64()),
    ("bss_fixed_size_binary", pa.binary(3)),
    ("rle_bool", pa.bool_()),
])
COLUMN_ENCODING = {
    "delta_int32": "DELTA_BINARY_PACKED",
    "delta_int64": "DELTA_BINARY_PACKED",
    "delta_length_string": "DELTA_LENGTH_BYTE_ARRAY",
    "delta_string": "DELTA_BYTE_ARRAY",
    "delta_fixed_size_binary": "DELTA_BYTE_ARRAY",
    "bss_float32": "BYTE_STREAM_SPLIT",
    "bss_float64": "BYTE_STREAM_SPLIT",
    "bss_int32": "BYTE_STREAM_SPLIT",
    "bss_int64": "BYTE_STREAM_SPLIT",
    "bss_fixed_size_binary": "BYTE_STREAM_SPLIT",
    "rle_bool": "RLE",
}
for name, version in [("encodings.parquet", "1.0"), ("encodings_v2.parquet", "2.0")]:
    write(name, encodings, ENCODINGS_SCHEMA, compression="NONE", data_page_version=version, use_dictionary=False,
          column_encoding=COLUMN_ENCODING, data_page_size=1024)

# --- nested.parquet / nested_v2.parquet ---------------------------------------


def maybe(i, every, value):
    return None if i % every == 0 else value


nested = {
    "ints": [[None, [], [None], [1, None, 3]][i] if i < 4 else
             maybe(i, 9, [rng.randint(-100, 100) for _ in range(i % 4)]) for i in range(N)],
    "nested_strings": [maybe(i, 7, [maybe(j + i, 5, [STRINGS[(i + j + k) % len(STRINGS)] for k in range(j)])
                                    for j in range(i % 3)]) for i in range(N)],
    "struct": [maybe(i, 6, {"a": i * 1000 - 20_000, "b": maybe(i, 4, [maybe(k, 3, i * k - 2**40) for k in range(i % 5)])})
               for i in range(N)],
    "map": [maybe(i, 8, [(f"k{j}", maybe(i + j, 4, i * j)) for j in range(i % 4)]) for i in range(N)],
    "required_struct": [{"x": i * 0.5 - 7} for i in range(N)],
    "structs": [maybe(i, 10, [maybe(i + j, 6, {"s": maybe(j, 4, STRINGS[(i * j) % len(STRINGS)]), "t": maybe(j, 3, i % 2 == 0)})
                              for j in range(i % 4)]) for i in range(N)],
}
NESTED_SCHEMA = pa.schema([
    ("ints", pa.list_(pa.int32())),
    ("nested_strings", pa.list_(pa.list_(pa.string()))),
    ("struct", pa.struct([pa.field("a", pa.int32(), nullable=False), ("b", pa.list_(pa.int64()))])),
    ("map", pa.map_(pa.string(), pa.int32())),
    pa.field("required_struct", pa.struct([("x", pa.float64())]), nullable=False),
    ("structs", pa.list_(pa.struct([("s", pa.string()), ("t", pa.bool_())]))),
])
for name, version in [("nested.parquet", "1.0"), ("nested_v2.parquet", "2.0")]:
    write(name, nested, NESTED_SCHEMA, compression="NONE", data_page_version=version, row_group_size=20,
          data_page_size=128)

# --- gzip.parquet / empty.parquet ---------------------------------------------

gzip = {
    "int64": nulls([rng.choice([5, -5, 2**50, I64_MIN]) for _ in range(N)], 7),
    "string": nulls([STRINGS[i % 5] * (i % 3) for i in range(N)], 6, 2),
    "ints": [maybe(i, 9, [i % 5, -(i % 3)] * (i % 3)) for i in range(N)],
}
write("gzip.parquet", gzip, pa.schema([("int64", pa.int64()), ("string", pa.string()), ("ints", pa.list_(pa.int32()))]),
      compression="gzip", data_page_version="2.0", use_dictionary=True, row_group_size=25, data_page_size=128)

write("empty.parquet", {"int32": [], "string": []}, pa.schema([("int32", pa.int32()), ("string", pa.string())]),
      compression="NONE")

(HERE / "gold.json").write_text(json.dumps({"writer": pa.__version__, "files": files}, separators=(",", ":")) + "\n")
print(", ".join(f"{f['name']} ({f['numRows']} rows)" for f in files))
