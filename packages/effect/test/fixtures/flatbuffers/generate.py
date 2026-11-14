"""
Gold corpus for effect/encoding/FlatBuffers: builder op sequences run by the
official FlatBuffers Python builder (pip install flatbuffers), and the bytes
it produces. The TypeScript test replays every op sequence through
FlatBuffers.Builder, expects the same bytes, and reads every value back.

    python test/fixtures/flatbuffers/generate.py   # writes gold.json

Ops (run in order; `ref` names the offset an op returns):
  {"op": "string", "ref", "value"}               CreateString
  {"op": "sharedString", "ref", "value"}         CreateSharedString
  {"op": "bytes", "ref", "value": [ints]}        CreateByteVector
  {"op": "vector", "ref", "type", "values"}      a vector of scalars
  {"op": "offsets", "ref", "refs"}               a vector of offsets
  {"op": "structs", "ref", "struct", "items"}    a vector of structs
  {"op": "table", "ref", "slots", "fields"}      a table; fields are added in order:
      {"slot", "kind": "scalar", "type", "value", "default"}
      {"slot", "kind": "offset", "ref"}
      {"slot", "kind": "struct", "struct", "value": [field values]}
Structs: {"size", "align", "fields": [{"type", "offset"}]}.
64-bit integers are decimal strings; non-finite floats are "Infinity",
"-Infinity" or "NaN".
"""

import json
import random
import struct as pystruct
from pathlib import Path

import flatbuffers
from flatbuffers import number_types as N

HERE = Path(__file__).parent

SCALARS = {
    "bool": (N.BoolFlags, 1),
    "int8": (N.Int8Flags, 1),
    "uint8": (N.Uint8Flags, 1),
    "int16": (N.Int16Flags, 2),
    "uint16": (N.Uint16Flags, 2),
    "int32": (N.Int32Flags, 4),
    "uint32": (N.Uint32Flags, 4),
    "int64": (N.Int64Flags, 8),
    "uint64": (N.Uint64Flags, 8),
    "float32": (N.Float32Flags, 4),
    "float64": (N.Float64Flags, 8),
}
SLOT = {
    "bool": "PrependBoolSlot",
    "int8": "PrependInt8Slot",
    "uint8": "PrependUint8Slot",
    "int16": "PrependInt16Slot",
    "uint16": "PrependUint16Slot",
    "int32": "PrependInt32Slot",
    "uint32": "PrependUint32Slot",
    "int64": "PrependInt64Slot",
    "uint64": "PrependUint64Slot",
    "float32": "PrependFloat32Slot",
    "float64": "PrependFloat64Slot",
}
PREPEND = {t: "Prepend" + s[len("Prepend"):-len("Slot")] for t, s in SLOT.items()}


def py(value, t):
    if t in ("int64", "uint64"):
        return int(value)
    if t in ("float32", "float64") and isinstance(value, str):
        return float(value)
    return value


def write_struct(b, s, values):
    b.Prep(s["align"], s["size"])
    fields = s["fields"]
    end = s["size"]
    for f, v in reversed(list(zip(fields, values))):
        size = SCALARS[f["type"]][1]
        b.Pad(end - (f["offset"] + size))
        getattr(b, PREPEND[f["type"]])(py(v, f["type"]))
        end = f["offset"]
    b.Pad(end)
    return b.Offset()


def run(case):
    b = flatbuffers.Builder(case.get("initialSize", 1024))
    if case.get("forceDefaults"):
        b.ForceDefaults(True)
    refs = {}
    for op in case["ops"]:
        kind = op["op"]
        if kind == "string":
            refs[op["ref"]] = b.CreateString(op["value"])
        elif kind == "sharedString":
            refs[op["ref"]] = b.CreateSharedString(op["value"])
        elif kind == "bytes":
            refs[op["ref"]] = b.CreateByteVector(bytes(op["value"]))
        elif kind == "vector":
            flags, size = SCALARS[op["type"]]
            b.StartVector(size, len(op["values"]), size)
            for v in reversed(op["values"]):
                getattr(b, PREPEND[op["type"]])(py(v, op["type"]))
            refs[op["ref"]] = b.EndVector()
        elif kind == "offsets":
            b.StartVector(4, len(op["refs"]), 4)
            for r in reversed(op["refs"]):
                b.PrependUOffsetTRelative(refs[r])
            refs[op["ref"]] = b.EndVector()
        elif kind == "structs":
            s = op["struct"]
            b.StartVector(s["size"], len(op["items"]), s["align"])
            for item in reversed(op["items"]):
                write_struct(b, s, item)
            refs[op["ref"]] = b.EndVector()
        elif kind == "table":
            b.StartObject(op["slots"])
            for f in op["fields"]:
                if f["kind"] == "scalar":
                    getattr(b, SLOT[f["type"]])(f["slot"], py(f["value"], f["type"]), py(f["default"], f["type"]))
                elif f["kind"] == "offset":
                    b.PrependUOffsetTRelativeSlot(f["slot"], refs[f["ref"]], 0)
                else:
                    b.PrependStructSlot(f["slot"], write_struct(b, f["struct"], f["value"]), 0)
            refs[op["ref"]] = b.EndObject()
        else:
            raise ValueError(kind)
    finish = case["finish"]
    identifier = finish.get("identifier")
    identifier = identifier.encode() if identifier is not None else None
    if finish.get("sizePrefixed"):
        b.FinishSizePrefixed(refs[finish["root"]], file_identifier=identifier)
    else:
        b.Finish(refs[finish["root"]], file_identifier=identifier)
    return bytes(b.Output()).hex()


# ---------------------------------------------------------------------------
# Cases
# ---------------------------------------------------------------------------

VEC3 = {"size": 12, "align": 4, "fields": [{"type": "float32", "offset": 0}, {"type": "float32", "offset": 4}, {"type": "float32", "offset": 8}]}
PADDED = {"size": 16, "align": 8, "fields": [{"type": "int8", "offset": 0}, {"type": "int32", "offset": 4}, {"type": "int64", "offset": 8}]}
SMALL = {"size": 4, "align": 2, "fields": [{"type": "uint8", "offset": 0}, {"type": "int16", "offset": 2}]}


def spec():
    out = []
    add = lambda id, description, **case: out.append({"id": id, "description": description, **case})
    add("empty-table", "a table without fields", ops=[{"op": "table", "ref": "t", "slots": 0, "fields": []}], finish={"root": "t"})
    add("monster", "strings, scalars, a struct, vectors and a nested table", ops=[
        {"op": "string", "ref": "name", "value": "Orc"},
        {"op": "bytes", "ref": "inventory", "value": [0, 1, 2, 3, 4]},
        {"op": "string", "ref": "sword", "value": "Sword"},
        {"op": "table", "ref": "weapon", "slots": 2, "fields": [
            {"slot": 0, "kind": "offset", "ref": "sword"},
            {"slot": 1, "kind": "scalar", "type": "int16", "value": 3, "default": 0}]},
        {"op": "offsets", "ref": "weapons", "refs": ["weapon"]},
        {"op": "table", "ref": "monster", "slots": 8, "fields": [
            {"slot": 0, "kind": "struct", "struct": VEC3, "value": [1.0, 2.0, 3.0]},
            {"slot": 2, "kind": "scalar", "type": "int16", "value": 300, "default": 100},
            {"slot": 3, "kind": "offset", "ref": "name"},
            {"slot": 5, "kind": "offset", "ref": "inventory"},
            {"slot": 6, "kind": "scalar", "type": "uint8", "value": 2, "default": 0},
            {"slot": 7, "kind": "offset", "ref": "weapons"}]}],
        finish={"root": "monster", "identifier": "MONS"})
    add("defaults-skipped", "scalars equal to their default are not written", ops=[
        {"op": "table", "ref": "t", "slots": 3, "fields": [
            {"slot": 0, "kind": "scalar", "type": "int32", "value": 7, "default": 7},
            {"slot": 1, "kind": "scalar", "type": "float64", "value": 0.5, "default": 0.5},
            {"slot": 2, "kind": "scalar", "type": "bool", "value": True, "default": True}]}], finish={"root": "t"})
    add("force-defaults", "forceDefaults writes defaults too", forceDefaults=True, ops=[
        {"op": "table", "ref": "t", "slots": 3, "fields": [
            {"slot": 0, "kind": "scalar", "type": "int32", "value": 7, "default": 7},
            {"slot": 1, "kind": "scalar", "type": "float64", "value": 0.5, "default": 0.5},
            {"slot": 2, "kind": "scalar", "type": "bool", "value": True, "default": True}]}], finish={"root": "t"})
    add("shared-vtables", "tables with the same layout share one vtable", ops=[
        {"op": "table", "ref": "a", "slots": 2, "fields": [{"slot": 0, "kind": "scalar", "type": "int32", "value": 1, "default": 0}]},
        {"op": "table", "ref": "b", "slots": 2, "fields": [{"slot": 0, "kind": "scalar", "type": "int32", "value": 2, "default": 0}]},
        {"op": "table", "ref": "c", "slots": 2, "fields": [{"slot": 1, "kind": "scalar", "type": "int32", "value": 3, "default": 0}]},
        {"op": "offsets", "ref": "all", "refs": ["a", "b", "c"]},
        {"op": "table", "ref": "root", "slots": 1, "fields": [{"slot": 0, "kind": "offset", "ref": "all"}]}], finish={"root": "root"})
    add("extremes", "integer and float extremes", ops=[
        {"op": "table", "ref": "t", "slots": 11, "fields": [
            {"slot": 0, "kind": "scalar", "type": "int8", "value": -128, "default": 0},
            {"slot": 1, "kind": "scalar", "type": "uint8", "value": 255, "default": 0},
            {"slot": 2, "kind": "scalar", "type": "int16", "value": -32768, "default": 0},
            {"slot": 3, "kind": "scalar", "type": "uint16", "value": 65535, "default": 0},
            {"slot": 4, "kind": "scalar", "type": "int32", "value": -2147483648, "default": 0},
            {"slot": 5, "kind": "scalar", "type": "uint32", "value": 4294967295, "default": 0},
            {"slot": 6, "kind": "scalar", "type": "int64", "value": "-9223372036854775808", "default": "0"},
            {"slot": 7, "kind": "scalar", "type": "uint64", "value": "18446744073709551615", "default": "0"},
            {"slot": 8, "kind": "scalar", "type": "float32", "value": -3.4028234663852886e38, "default": 0.0},
            {"slot": 9, "kind": "scalar", "type": "float64", "value": 5e-324, "default": 0.0},
            {"slot": 10, "kind": "scalar", "type": "float64", "value": "Infinity", "default": 0.0}]}], finish={"root": "t"})
    add("strings", "empty, unicode and shared strings", ops=[
        {"op": "string", "ref": "e", "value": ""},
        {"op": "string", "ref": "u", "value": "héllo wörld 😀 ￿"},
        {"op": "sharedString", "ref": "s1", "value": "shared"},
        {"op": "sharedString", "ref": "s2", "value": "shared"},
        {"op": "offsets", "ref": "v", "refs": ["e", "u", "s1", "s2"]},
        {"op": "table", "ref": "t", "slots": 1, "fields": [{"slot": 0, "kind": "offset", "ref": "v"}]}], finish={"root": "t"})
    add("scalar-vectors", "vectors of every scalar type", ops=[
        *[{"op": "vector", "ref": t, "type": t, "values": vals} for t, vals in [
            ("bool", [True, False, True]), ("int8", [-1, 2]), ("uint8", []), ("int16", [-300, 300, 7]),
            ("uint16", [65535]), ("int32", [1, -2, 3, -4, 5]), ("uint32", [4000000000]),
            ("int64", ["-5", "9007199254740993"]), ("uint64", ["18446744073709551615"]), ("float32", [1.5, -0.25]),
            ("float64", [3.141592653589793, -0.0])]],
        {"op": "table", "ref": "t", "slots": 11, "fields": [
            {"slot": i, "kind": "offset", "ref": t} for i, t in enumerate(
                ["bool", "int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float32", "float64"])]}],
        finish={"root": "t"})
    add("struct-vectors", "vectors of structs with padding", ops=[
        {"op": "structs", "ref": "p", "struct": PADDED, "items": [[1, 2, "3"], [-1, -2, "-3"]]},
        {"op": "structs", "ref": "s", "struct": SMALL, "items": [[255, -1], [0, 2], [7, 300]]},
        {"op": "table", "ref": "t", "slots": 3, "fields": [
            {"slot": 0, "kind": "offset", "ref": "p"},
            {"slot": 1, "kind": "struct", "struct": PADDED, "value": [9, 8, "7"]},
            {"slot": 2, "kind": "offset", "ref": "s"}]}], finish={"root": "t"})
    add("size-prefixed", "a size-prefixed buffer with an identifier", ops=[
        {"op": "string", "ref": "s", "value": "x"},
        {"op": "table", "ref": "t", "slots": 2, "fields": [
            {"slot": 0, "kind": "offset", "ref": "s"},
            {"slot": 1, "kind": "scalar", "type": "int64", "value": "42", "default": "0"}]}],
        finish={"root": "t", "identifier": "ABCD", "sizePrefixed": True})
    add("growth", "a small initial size grows", initialSize=1, ops=[
        {"op": "bytes", "ref": "b", "value": list(range(256)) * 4},
        {"op": "table", "ref": "t", "slots": 1, "fields": [{"slot": 0, "kind": "offset", "ref": "b"}]}], finish={"root": "t"})
    return out


# ---------------------------------------------------------------------------
# Random cases
# ---------------------------------------------------------------------------

def random_scalar(rng, t):
    if t == "bool":
        return rng.random() < 0.5
    if t == "float32":
        return rng.choice([0.0, 1.5, -2.25, 1024.0, 3.0e10, -0.5])
    if t == "float64":
        return rng.choice([0.0, 0.1, -1e-300, 2.5, 1e300, 123456.789])
    bits = {"int8": 8, "uint8": 8, "int16": 16, "uint16": 16, "int32": 32, "uint32": 32, "int64": 64, "uint64": 64}[t]
    signed = not t.startswith("u")
    lo, hi = (-(2 ** (bits - 1)), 2 ** (bits - 1) - 1) if signed else (0, 2 ** bits - 1)
    v = rng.choice([0, 1, lo, hi, rng.randint(lo, hi), rng.randint(-5, 5) if signed else rng.randint(0, 5)])
    return str(v) if bits == 64 else v


STRUCTS = [VEC3, PADDED, SMALL]
TYPES = list(SCALARS)


def random_case(rng, index):
    ops = []
    counter = [0]

    def ref():
        counter[0] += 1
        return f"r{counter[0]}"

    def table(depth):
        slots = rng.randint(0, 8)
        fields = []
        for slot in rng.sample(range(slots), rng.randint(0, slots)) if slots else []:
            r = rng.random()
            if r < 0.45:
                t = rng.choice(TYPES)
                v = random_scalar(rng, t)
                d = v if rng.random() < 0.2 else random_scalar(rng, t)
                fields.append({"slot": slot, "kind": "scalar", "type": t, "value": v, "default": d})
            elif r < 0.6:
                s = rng.choice(STRUCTS)
                fields.append({"slot": slot, "kind": "struct", "struct": s,
                               "value": [random_scalar(rng, f["type"]) for f in s["fields"]]})
            else:
                child = rng.random()
                name = ref()
                if child < 0.25:
                    ops.append({"op": "string", "ref": name, "value": rng.choice(["", "a", "héllo", "😀😀", "x" * 40])})
                elif child < 0.4:
                    ops.append({"op": "bytes", "ref": name, "value": [rng.randint(0, 255) for _ in range(rng.randint(0, 20))]})
                elif child < 0.6:
                    t = rng.choice(TYPES)
                    ops.append({"op": "vector", "ref": name, "type": t,
                                "values": [random_scalar(rng, t) for _ in range(rng.randint(0, 6))]})
                elif child < 0.7:
                    s = rng.choice(STRUCTS)
                    ops.append({"op": "structs", "ref": name, "struct": s,
                                "items": [[random_scalar(rng, f["type"]) for f in s["fields"]] for _ in range(rng.randint(0, 4))]})
                elif child < 0.85 and depth < 3:
                    name = table(depth + 1)
                elif depth < 3:
                    children = [table(depth + 1) for _ in range(rng.randint(0, 3))]
                    ops.append({"op": "offsets", "ref": name, "refs": children})
                else:
                    ops.append({"op": "string", "ref": name, "value": "leaf"})
                fields.append({"slot": slot, "kind": "offset", "ref": name})
        name = ref()
        ops.append({"op": "table", "ref": name, "slots": slots, "fields": fields})
        return name

    root = table(0)
    finish = {"root": root}
    if rng.random() < 0.3:
        finish["identifier"] = rng.choice(["ABCD", "MONS", "1234"])
    if rng.random() < 0.2:
        finish["sizePrefixed"] = True
    case = {"id": f"random/{index:03d}", "description": "seeded random buffer", "ops": ops, "finish": finish}
    if rng.random() < 0.15:
        case["forceDefaults"] = True
    if rng.random() < 0.2:
        case["initialSize"] = rng.choice([1, 16, 100])
    return case


def main():
    rng = random.Random(20261114)
    cases = spec() + [random_case(rng, i) for i in range(300)]
    for c in cases:
        c["bytes"] = run(c)
    header = {"generator": "generate.py", "flatbuffers": flatbuffers.__version__ if hasattr(flatbuffers, "__version__") else "?"}
    (HERE / "gold.json").write_text(json.dumps({**header, "cases": cases}, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n")
    print(f"{len(cases)} cases, {sum(len(c['bytes']) // 2 for c in cases)} bytes")


if __name__ == "__main__":
    main()
