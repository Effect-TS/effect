"""
Gold corpus for effect/encoding/Thrift: values written by the official Apache
Thrift Python library's TCompactProtocol (pip install thrift), and the bytes
it produces. The TypeScript test reads every case back into a Thrift.Value,
expects the same tree, and writes the tree back, expecting the same bytes.

    PARQUET_TESTING=/path/to/apache/parquet-testing \
      python test/fixtures/thrift/generate.py   # writes gold.json

Values are JSON trees shaped like Thrift.Value:
  {"_tag": "Bool", "value": true}
  {"_tag": "I8" | "I16" | "I32", "value": 5}
  {"_tag": "I64", "value": "-5"}                       decimal string
  {"_tag": "Double", "value": 1.5}                     or "NaN", "Infinity", "-Infinity", "-0"
  {"_tag": "Binary" | "Uuid", "value": "00ff"}         hex
  {"_tag": "Struct", "fields": [{"id": 1, "value": ...}]}
  {"_tag": "List" | "Set", "elementType": "I32", "elements": [...]}
  {"_tag": "Map", "keyType": "I32", "valueType": "Bool", "entries": [[k, v]]}
A case is {"id", "type", "value", "bytes"}: `type` is the Type name of the
top-level value. Every case is also read back here with the Python reader to
check the generator.

The "parquet" cases are Thrift structs cut from parquet-testing files (a
footer, page headers, a bloom filter header, column and offset indexes),
with the tree the Python reader reads from them.
"""

import json
import math
import os
import random
import struct
import uuid
from pathlib import Path

from thrift.protocol.TCompactProtocol import TCompactProtocol
from thrift.Thrift import TType
from thrift.transport.TTransport import TMemoryBuffer

HERE = Path(__file__).parent

TTYPES = {
    "Bool": TType.BOOL,
    "I8": TType.BYTE,
    "I16": TType.I16,
    "I32": TType.I32,
    "I64": TType.I64,
    "Double": TType.DOUBLE,
    "Binary": TType.STRING,
    "Uuid": TType.UUID,
    "Struct": TType.STRUCT,
    "List": TType.LIST,
    "Set": TType.SET,
    "Map": TType.MAP,
    "Stop": TType.STOP,
}
NAMES = {v: k for k, v in TTYPES.items()}

# TCompactProtocol only writes scalars inside a struct or container; these
# are its internal states for "a value comes next".
VALUE_WRITE = 2
VALUE_READ = 7


def double_json(d):
    if math.isnan(d):
        return "NaN"
    if math.isinf(d):
        return "Infinity" if d > 0 else "-Infinity"
    if d == 0 and math.copysign(1, d) < 0:
        return "-0"
    return d


def double_py(v):
    return float(v) if isinstance(v, str) else float(v)


def write(p, v):
    tag = v["_tag"]
    if tag == "Bool":
        p.writeBool(v["value"])
    elif tag == "I8":
        p.writeByte(v["value"])
    elif tag == "I16":
        p.writeI16(v["value"])
    elif tag == "I32":
        p.writeI32(v["value"])
    elif tag == "I64":
        p.writeI64(int(v["value"]))
    elif tag == "Double":
        p.writeDouble(double_py(v["value"]))
    elif tag == "Binary":
        p.writeBinary(bytes.fromhex(v["value"]))
    elif tag == "Uuid":
        p.writeUuid(uuid.UUID(bytes=bytes.fromhex(v["value"])))
    elif tag == "Struct":
        p.writeStructBegin(None)
        for f in v["fields"]:
            p.writeFieldBegin(None, TTYPES[f["value"]["_tag"]], f["id"])
            write(p, f["value"])
            p.writeFieldEnd()
        p.writeFieldStop()
        p.writeStructEnd()
    elif tag in ("List", "Set"):
        begin = p.writeListBegin if tag == "List" else p.writeSetBegin
        begin(TTYPES[v["elementType"]], len(v["elements"]))
        for e in v["elements"]:
            write(p, e)
        p.writeListEnd()
    elif tag == "Map":
        p.writeMapBegin(TTYPES[v["keyType"]], TTYPES[v["valueType"]], len(v["entries"]))
        for k, x in v["entries"]:
            write(p, k)
            write(p, x)
        p.writeMapEnd()
    else:
        raise ValueError(tag)


def read(p, t):
    name = NAMES[t]
    if name == "Bool":
        return {"_tag": name, "value": p.readBool()}
    if name == "I8":
        return {"_tag": name, "value": p.readByte()}
    if name == "I16":
        return {"_tag": name, "value": p.readI16()}
    if name == "I32":
        return {"_tag": name, "value": p.readI32()}
    if name == "I64":
        return {"_tag": name, "value": str(p.readI64())}
    if name == "Double":
        return {"_tag": name, "value": double_json(p.readDouble())}
    if name == "Binary":
        return {"_tag": name, "value": p.readBinary().hex()}
    if name == "Uuid":
        return {"_tag": name, "value": p.readUuid().bytes.hex()}
    if name == "Struct":
        fields = []
        p.readStructBegin()
        while True:
            _, ft, fid = p.readFieldBegin()
            if ft == TType.STOP:
                break
            fields.append({"id": fid, "value": read(p, ft)})
            p.readFieldEnd()
        p.readStructEnd()
        return {"_tag": name, "fields": fields}
    if name in ("List", "Set"):
        et, n = p.readListBegin()
        elements = [read(p, et) for _ in range(n)]
        p.readListEnd()
        return {"_tag": name, "elementType": NAMES[et], "elements": elements}
    if name == "Map":
        kt, vt, n = p.readMapBegin()
        entries = []
        for _ in range(n):
            k = read(p, kt)
            entries.append([k, read(p, vt)])
        p.readMapEnd()
        return {"_tag": name, "keyType": NAMES[kt], "valueType": NAMES[vt], "entries": entries}
    raise ValueError(name)


def encode(v):
    buf = TMemoryBuffer()
    p = TCompactProtocol(buf)
    if v["_tag"] != "Struct":
        p.state = VALUE_WRITE
    write(p, v)
    return buf.getvalue()


def decode(data, type_name, offset=0):
    """Reads one value at `offset`; returns it and the number of bytes read."""
    buf = TMemoryBuffer(data[offset:])
    p = TCompactProtocol(buf)
    if type_name != "Struct":
        p.state = VALUE_READ
    v = read(p, TTYPES[type_name])
    return v, buf._buffer.tell()


cases = []


def case(id, v):
    data = encode(v)
    back, n = decode(data, v["_tag"])
    assert back == v, (id, back, v)
    assert n == len(data), id
    cases.append({"id": id, "type": v["_tag"], "value": v, "bytes": data.hex()})


# --- value constructors -------------------------------------------------------


def b(x):
    return {"_tag": "Bool", "value": x}


def i8(x):
    return {"_tag": "I8", "value": x}


def i16(x):
    return {"_tag": "I16", "value": x}


def i32(x):
    return {"_tag": "I32", "value": x}


def i64(x):
    return {"_tag": "I64", "value": str(x)}


def dbl(x):
    return {"_tag": "Double", "value": double_json(x)}


def binary(x):
    return {"_tag": "Binary", "value": bytes(x).hex()}


def text(s):
    return binary(s.encode("utf-8"))


def uid(x):
    return {"_tag": "Uuid", "value": bytes(x).hex()}


def struct_(*fields):
    return {"_tag": "Struct", "fields": [{"id": i, "value": v} for i, v in fields]}


def lst(t, *es):
    return {"_tag": "List", "elementType": t, "elements": list(es)}


def st(t, *es):
    return {"_tag": "Set", "elementType": t, "elements": list(es)}


def mp(k, v, *entries):
    if not entries:
        k = v = "Stop"
    return {"_tag": "Map", "keyType": k, "valueType": v, "entries": [list(e) for e in entries]}


# --- hand-written cases -------------------------------------------------------

case("struct/empty", struct_())
case("bool/fields", struct_((1, b(True)), (2, b(False)), (3, b(True))))
case("bool/long-form", struct_((20, b(True)), (-1, b(False))))
case("field/delta-1", struct_((1, i32(1)), (2, i32(2))))
case("field/delta-15", struct_((15, i32(1)), (30, i32(2))))
case("field/delta-16", struct_((16, i32(1)), (32, i32(2))))
case("field/id-0", struct_((0, i32(1))))
case("field/decreasing", struct_((5, i32(1)), (3, i32(2)), (4, i32(3))))
case("field/repeated", struct_((5, i32(1)), (5, i32(2))))
case("field/negative", struct_((-1, i32(1)), (-32768, i32(2)), (1, i32(3))))
case("field/max", struct_((32767, i32(1))))
case("field/nested-resets", struct_((5, struct_((1, i8(1)), (2, i8(2)))), (6, i8(3))))
case("i8/bounds", struct_((1, i8(-128)), (2, i8(127)), (3, i8(0)), (4, i8(-1))))
case("i16/bounds", struct_((1, i16(-32768)), (2, i16(32767)), (3, i16(0)), (4, i16(-1)), (5, i16(64)), (6, i16(-65))))
case(
    "i32/bounds",
    struct_(
        (1, i32(-(2**31))), (2, i32(2**31 - 1)), (3, i32(0)), (4, i32(-1)), (5, i32(63)), (6, i32(64)),
        (7, i32(8191)), (8, i32(8192)), (9, i32(-8193))
    ),
)
case(
    "i64/bounds",
    struct_(*enumerate([
        i64(0), i64(-1), i64(1), i64(2**31), i64(-(2**31) - 1), i64(2**53 - 1), i64(-(2**53 - 1)), i64(2**53),
        i64(-(2**53)), i64(2**53 + 1), i64(-(2**53) - 1), i64(2**62), i64(2**63 - 1), i64(-(2**63)),
        i64(2**56 - 1), i64(1 << 49)
    ], 1)),
)
case(
    "double/values",
    struct_(*enumerate([
        dbl(0.0), dbl(-0.0), dbl(1.5), dbl(float("nan")), dbl(float("inf")), dbl(float("-inf")), dbl(5e-324),
        dbl(1.7976931348623157e308), dbl(math.pi), dbl(-2.5)
    ], 1)),
)
case(
    "binary/lengths",
    struct_((1, binary(b"")), (2, binary(b"\x00")), (3, binary(bytes(range(127)))), (4, binary(bytes(128))),
            (5, binary(bytes(i % 256 for i in range(300))))),
)
case("binary/utf8", struct_((1, text("héllo 🌍")), (2, text("")), (3, text("ascii")), (4, text("日本語" * 30))))
case("uuid", struct_((1, uid(range(16))), (2, uid(bytes(16)))))
case("list/empty", struct_((1, lst("I32")), (2, lst("Struct")), (3, lst("Bool"))))
case("list/size-14", struct_((1, lst("I32", *[i32(i) for i in range(14)]))))
case("list/size-15", struct_((1, lst("I32", *[i32(i) for i in range(15)]))))
case("list/size-200", struct_((1, lst("I16", *[i16(i - 100) for i in range(200)]))))
case("list/bool", struct_((1, lst("Bool", b(True), b(False), b(True)))))
case("list/i8", struct_((1, lst("I8", i8(-1), i8(0), i8(127)))))
case("list/i64", struct_((1, lst("I64", i64(-(2**63)), i64(0), i64(2**63 - 1)))))
case("list/double", struct_((1, lst("Double", dbl(1.0), dbl(float("nan"))))))
case("list/binary", struct_((1, lst("Binary", text("a"), text(""), text("bc")))))
case("list/uuid", struct_((1, lst("Uuid", uid(range(16)), uid(range(16, 32))))))
case("list/struct", struct_((1, lst("Struct", struct_((1, b(True))), struct_(), struct_((2, i32(7)))))))
case("list/list", struct_((1, lst("List", lst("I32", i32(1)), lst("I32"), lst("Bool", b(False))))))
case("list/map", struct_((1, lst("Map", mp("I32", "I32", (i32(1), i32(2))), mp("I32", "I32")))))
case("set/values", struct_((1, st("I32", i32(3), i32(1))), (2, st("Binary")), (3, st("Bool", b(True)))))
case("set/size-20", struct_((1, st("I64", *[i64(i * 1000) for i in range(20)]))))
case("map/empty", struct_((1, mp("I32", "I32"))))
case("map/one", struct_((1, mp("Binary", "I64", (text("k"), i64(-5))))))
case("map/bools", struct_((1, mp("Bool", "Bool", (b(True), b(False)), (b(False), b(True))))))
case("map/i32-struct", struct_((1, mp("I32", "Struct", (i32(1), struct_((1, b(True)))), (i32(2), struct_())))))
case("map/size-20", struct_((1, mp("I16", "Double", *[(i16(i), dbl(i / 2)) for i in range(20)]))))
case("map/nested", struct_((1, mp("I32", "List", (i32(1), lst("I32", i32(2), i32(3)))))))
case("map/uuid", struct_((1, mp("Uuid", "Uuid", (uid(range(16)), uid(bytes(16)))))))


def nest(depth):
    v = struct_((1, i32(depth)))
    for d in range(depth):
        v = struct_((1, v), (2, b(d % 2 == 0)))
    return v


case("struct/deep-20", nest(20))
case("top/list", lst("I32", i32(1), i32(-1)))
case("top/i64", i64(-(2**40)))
case("top/binary", text("top"))
case("top/map", mp("Binary", "Binary", (text("a"), text("b"))))
case("top/set", st("Struct", struct_((1, i8(1)))))
case("top/double", dbl(0.1))

# --- seeded random structs ----------------------------------------------------

rng = random.Random(0x7487)
SCALARS = ["Bool", "I8", "I16", "I32", "I64", "Double", "Binary", "Uuid"]
ALL = SCALARS + ["Struct", "List", "Set", "Map"]


def rand_int(bits):
    r = rng.random()
    if r < 0.3:
        return rng.randint(-64, 64)
    if r < 0.4:
        return rng.choice([-(2 ** (bits - 1)), 2 ** (bits - 1) - 1, 0, -1])
    w = rng.randint(1, bits - 1)
    return rng.randint(-(2**w), 2**w - 1)


def rand_double():
    r = rng.random()
    if r < 0.1:
        return rng.choice([0.0, -0.0, float("inf"), float("-inf"), float("nan"), 5e-324])
    if r < 0.4:
        return float(rng.randint(-1000, 1000))
    return struct.unpack("<d", struct.pack("<Q", rng.getrandbits(64)))[0] if r < 0.6 else rng.uniform(-1e6, 1e6)


def rand_bytes():
    n = rng.choice([0, 1, 3, 10, 127, 128, 200]) if rng.random() < 0.3 else rng.randint(0, 20)
    if rng.random() < 0.5:
        alphabet = "abcdefghijklmnopqrstuvwxyz _-/.éü日🌍"
        return "".join(rng.choice(alphabet) for _ in range(n)).encode("utf-8")
    return bytes(rng.getrandbits(8) for _ in range(n))


def rand_value(t, depth):
    if t == "Bool":
        return b(rng.random() < 0.5)
    if t == "I8":
        return i8(rand_int(8))
    if t == "I16":
        return i16(rand_int(16))
    if t == "I32":
        return i32(rand_int(32))
    if t == "I64":
        return i64(rand_int(64))
    if t == "Double":
        return dbl(rand_double())
    if t == "Binary":
        return binary(rand_bytes())
    if t == "Uuid":
        return uid(bytes(rng.getrandbits(8) for _ in range(16)))
    if t == "Struct":
        return rand_struct(depth + 1)
    if t in ("List", "Set"):
        et = rand_type(depth + 1)
        sizes = [0, 1, 2, 5, 14, 15, 16, 30] if depth < 2 else [0, 1, 2]
        n = rng.choice(sizes) if rng.random() < 0.5 else rng.randint(0, 6 if depth < 2 else 2)
        return {"_tag": t, "elementType": et, "elements": [rand_value(et, depth + 1) for _ in range(n)]}
    if t == "Map":
        kt = rand_type(depth + 1)
        vt = rand_type(depth + 1)
        n = rng.choice([0, 1, 3, 16]) if rng.random() < 0.3 else rng.randint(0, 5)
        entries = [(rand_value(kt, depth + 1), rand_value(vt, depth + 1)) for _ in range(n)]
        return mp(kt, vt, *entries)
    raise ValueError(t)


def rand_type(depth):
    return rng.choice(SCALARS if depth >= 3 or rng.random() < 0.6 else ALL)


def rand_struct(depth):
    n = rng.randint(0, 3 if depth > 2 else 8)
    ids = []
    last = 0
    for _ in range(n):
        r = rng.random()
        if r < 0.6:
            last += rng.randint(1, 15)
        elif r < 0.8:
            last += rng.randint(16, 300)
        elif r < 0.9:
            last = rng.randint(-32768, 32767)
        else:
            last = rng.randint(-5, 5)
        last = max(-32768, min(32767, last))
        ids.append(last)
    return struct_(*[(i, rand_value(rand_type(depth), depth)) for i in ids])


for n in range(300):
    case(f"random/{n}", rand_struct(0))

# --- Parquet structs ----------------------------------------------------------


def field(v, fid):
    for f in v["fields"]:
        if f["id"] == fid:
            return f["value"]
    return None


parquet = []


def cut(file, data, offset, what):
    v, n = decode(data, "Struct", offset)
    parquet.append({
        "id": f"{file}/{what}",
        "value": v,
        "bytes": data[offset:offset + n].hex(),
    })
    return v


root = os.environ.get("PARQUET_TESTING")
assert root, "set PARQUET_TESTING to a checkout of https://github.com/apache/parquet-testing"
# The tiny-pages file's indexes have thousands of entries; its footer is enough.
for file, indexes in [("data_index_bloom_encoding_stats.parquet", True), ("alltypes_tiny_pages.parquet", False)]:
    data = (Path(root) / "data" / file).read_bytes()
    assert data[-4:] == b"PAR1"
    length = struct.unpack("<I", data[-8:-4])[0]
    footer = cut(file, data, len(data) - 8 - length, "footer")
    column = field(field(footer, 4)["elements"][0], 1)["elements"][0]
    meta = field(column, 3)
    cut(file, data, int(field(meta, 9)["value"]), "page-header")
    bloom = field(meta, 14)
    if bloom is not None:
        cut(file, data, int(bloom["value"]), "bloom-filter-header")
    if indexes and field(column, 4) is not None:
        cut(file, data, int(field(column, 4)["value"]), "offset-index")
    if indexes and field(column, 6) is not None:
        cut(file, data, int(field(column, 6)["value"]), "column-index")

(HERE / "gold.json").write_text(json.dumps({"cases": cases, "parquet": parquet}, separators=(",", ":")) + "\n")
print(f"{len(cases)} cases, {len(parquet)} parquet structs")
