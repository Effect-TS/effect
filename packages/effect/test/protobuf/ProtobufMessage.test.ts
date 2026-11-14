import { assert, describe, it } from "@effect/vitest"
import * as Hex from "effect/encoding/Hex"
import { ProtobufMessage } from "effect/protobuf"
import * as Result from "effect/Result"
import { message, registry } from "./descriptors.ts"

const unknownFields: typeof ProtobufMessage.unknownFields = ProtobufMessage.unknownFields

const bytes = (hex: string): Uint8Array => Result.getOrThrow(Hex.decode(hex.replaceAll(" ", "")))

const encode = (typeName: string, value: unknown, options?: ProtobufMessage.EncodeOptions): string =>
  Hex.encode(Result.getOrThrow(ProtobufMessage.encode(message(typeName), options)(value as ProtobufMessage.Message)))

const decode = (typeName: string, hex: string, options?: ProtobufMessage.DecodeOptions): ProtobufMessage.Message =>
  Result.getOrThrow(ProtobufMessage.decode(message(typeName), options)(bytes(hex)))

const failure = <A>(result: Result.Result<A, ProtobufMessage.ProtobufMessageError>) => {
  if (Result.isSuccess(result)) throw new Error("expected a failure")
  return { message: result.failure.message, path: result.failure.path }
}

const scalarZeros = {
  double: 0,
  float: 0,
  int64: 0n,
  uint64: 0n,
  int32: 0,
  fixed64: 0n,
  fixed32: 0,
  bool: false,
  string: "",
  bytes: new Uint8Array(0),
  uint32: 0,
  sfixed32: 0,
  sfixed64: 0n,
  sint32: 0,
  sint64: 0n
}

const shapeZeros = {
  name: "",
  points: [],
  ids: [],
  weights: [],
  tags: [],
  counts: {},
  byId: {},
  flags: {},
  color: 0,
  colors: [],
  floats: []
}

const legacyZeros = { values: [], modes: [], modeByName: {} }

describe("ProtobufMessage", () => {
  // Each case encodes to its bytes, and decodes back to its value, with the
  // zero values of the other fields.
  describe("encodes and decodes", () => {
    const cases: ReadonlyArray<readonly [string, string, object, string, object]> = [
      ["double 1.5", "test.Scalars", { double: 1.5 }, "09 000000000000f83f", scalarZeros],
      ["double -0, which is written", "test.Scalars", { double: -0 }, "09 0000000000000080", scalarZeros],
      ["float 1.5", "test.Scalars", { float: 1.5 }, "15 0000c03f", scalarZeros],
      ["int64 -1", "test.Scalars", { int64: -1n }, "18 ffffffffffffffffff01", scalarZeros],
      ["uint64 max", "test.Scalars", { uint64: 2n ** 64n - 1n }, "20 ffffffffffffffffff01", scalarZeros],
      ["int32 -2, as ten bytes", "test.Scalars", { int32: -2 }, "28 feffffffffffffffff01", scalarZeros],
      ["fixed64 1", "test.Scalars", { fixed64: 1n }, "31 0100000000000000", scalarZeros],
      ["fixed32 max", "test.Scalars", { fixed32: 4294967295 }, "3d ffffffff", scalarZeros],
      ["bool", "test.Scalars", { bool: true }, "40 01", scalarZeros],
      ["string", "test.Scalars", { string: "é" }, "4a 02 c3a9", scalarZeros],
      ["bytes", "test.Scalars", { bytes: new Uint8Array([1, 2]) }, "62 02 0102", scalarZeros],
      ["uint32 150", "test.Scalars", { uint32: 150 }, "68 9601", scalarZeros],
      ["sfixed32 -2", "test.Scalars", { sfixed32: -2 }, "7d feffffff", scalarZeros],
      ["sfixed64 -2", "test.Scalars", { sfixed64: -2n }, "8101 feffffffffffffff", scalarZeros],
      ["sint32 -1", "test.Scalars", { sint32: -1 }, "8801 01", scalarZeros],
      ["sint64 -1", "test.Scalars", { sint64: -1n }, "9001 01", scalarZeros],
      ["an int64 as a string", "test.Js", { asString: "-1" }, "08 ffffffffffffffffff01", {
        asString: "0",
        asNumber: 0
      }],
      ["an int64 as a number", "test.Js", { asNumber: 2 ** 53 }, "10 8080808080808010", { asString: "0", asNumber: 0 }],
      ["an explicit zero", "test.Optional", { a: 0 }, "0800", {}],
      ["a message", "test.Shape", { origin: { x: 1, y: 0 } }, "12 02 0801", shapeZeros],
      [
        "repeated messages",
        "test.Shape",
        { points: [{ x: 1, y: 0 }, { x: 0, y: 2 }] },
        "1a02 0801 1a02 1002",
        shapeZeros
      ],
      ["a oneof case", "test.Shape", { kind: { _tag: "label", value: "hi" } }, "22 02 6869", shapeZeros],
      ["a oneof message", "test.Shape", { kind: { _tag: "center", value: { x: 1, y: 0 } } }, "2a 02 0801", shapeZeros],
      ["packed integers", "test.Shape", { ids: [1, 2, 300] }, "32 04 0102ac02", shapeZeros],
      ["packed doubles", "test.Shape", { weights: [0.5] }, "3a 08 000000000000e03f", shapeZeros],
      ["packed floats", "test.Shape", { floats: [1, -2] }, "72 08 0000803f000000c0", shapeZeros],
      ["repeated strings", "test.Shape", { tags: ["a", "b"] }, "42 01 61 42 01 62", shapeZeros],
      ["a map of strings", "test.Shape", { counts: { a: 1 } }, "4a 05 0a0161 1001", shapeZeros],
      ["a map of int64 keys", "test.Shape", { byId: { "-5": "x" } }, "52 0e 08fbffffffffffffffff01 120178", shapeZeros],
      ["a map of messages", "test.Shape", { flags: { true: { x: 1, y: 0 } } }, "5a 06 0801 12020801", shapeZeros],
      ["an enum", "test.Shape", { color: 1 }, "60 01", shapeZeros],
      ["packed enums", "test.Shape", { colors: [1, 0] }, "6a 02 0100", shapeZeros],
      ["a required field", "legacy.Legacy", { id: 1 }, "0801", legacyZeros],
      ["an explicit empty string", "legacy.Legacy", { id: 1, name: "" }, "0801 1200", legacyZeros],
      ["proto2 repeated fields, expanded", "legacy.Legacy", { id: 1, values: [1, 2] }, "0801 1801 1802", legacyZeros],
      ["a group", "legacy.Legacy", { id: 1, item: { x: 1 } }, "0801 23 2801 24", legacyZeros],
      ["a closed enum", "legacy.Legacy", { id: 1, mode: 2 }, "0801 3002", legacyZeros],
      ["packed closed enums", "legacy.Legacy", { id: 1, modes: [1, 2] }, "0801 3a02 0102", legacyZeros],
      [
        "a map of a closed enum",
        "legacy.Legacy",
        { id: 1, modeByName: { a: 1 } },
        "0801 4205 0a0161 1001",
        legacyZeros
      ],
      ["explicit presence by default in editions", "editions.E", { a: 0 }, "0800", { b: 0, c: [] }],
      ["packed by default in editions", "editions.E", { b: 1, c: [1, 2] }, "1001 1a020102", { b: 0, c: [] }],
      ["delimited messages in editions", "editions.E", { d: { x: 1 } }, "23 0801 24", { b: 0, c: [] }]
    ]
    for (const [name, typeName, value, hex, zeros] of cases) {
      it(name, () => {
        assert.strictEqual(encode(typeName, value), hex.replaceAll(" ", ""))
        assert.deepStrictEqual(decode(typeName, hex), { ...zeros, ...value })
      })
    }
  })

  it("leaves out implicit zero values", () => {
    assert.strictEqual(encode("test.Scalars", scalarZeros), "")
    assert.strictEqual(encode("test.Shape", shapeZeros), "")
    assert.strictEqual(encode("test.Shape", {}), "")
  })

  it("takes 64-bit integers as a bigint, number or decimal string", () => {
    for (const int64 of [-1n, -1, "-1"]) assert.strictEqual(encode("test.Scalars", { int64 }), "18ffffffffffffffffff01")
  })

  it("rounds a JS_NUMBER int64 outside the safe integers, as Number does", () => {
    assert.strictEqual(decode("test.Js", "10 8180808080808010").asNumber, 2 ** 53)
  })

  describe("decodes", () => {
    const cases: ReadonlyArray<readonly [string, string, string, object]> = [
      ["merged occurrences of a message", "test.Shape", "12020801 12021002", { ...shapeZeros, origin: { x: 1, y: 2 } }],
      ["the last occurrence of a scalar", "test.Shape", "0a0161 0a0162", { ...shapeZeros, name: "b" }],
      ["the last case of a oneof", "test.Shape", "22026869 2a020801", {
        ...shapeZeros,
        kind: { _tag: "center", value: { x: 1, y: 0 } }
      }],
      ["merged occurrences of a oneof message", "test.Shape", "2a020801 2a021002", {
        ...shapeZeros,
        kind: { _tag: "center", value: { x: 1, y: 2 } }
      }],
      ["a packed field written unpacked", "test.Shape", "3001 3002", { ...shapeZeros, ids: [1, 2] }],
      ["map entries without a value or key", "test.Shape", "4a03 0a0161 4a02 1001", {
        ...shapeZeros,
        counts: { a: 0, "": 1 }
      }],
      ["a field of another wire type, as an unknown field", "test.Shape", "0d00000000", {
        ...shapeZeros,
        [unknownFields]: bytes("0d00000000")
      }],
      ["an undeclared field, as an unknown field", "test.Point", "f80701", {
        x: 0,
        y: 0,
        [unknownFields]: bytes("f80701")
      }],
      ["an unknown number of a closed enum, as an unknown field", "legacy.Legacy", "0801 3007", {
        ...legacyZeros,
        id: 1,
        [unknownFields]: bytes("3007")
      }],
      ["unknown numbers of a packed closed enum, as unpacked fields", "legacy.Legacy", "0801 3a03 010702", {
        ...legacyZeros,
        id: 1,
        modes: [1, 2],
        [unknownFields]: bytes("3807")
      }],
      [
        "a map entry with an unknown closed enum number, as an unknown field",
        "legacy.Legacy",
        "0801 4205 0a0161 1007",
        {
          ...legacyZeros,
          id: 1,
          [unknownFields]: bytes("4205 0a0161 1007")
        }
      ],
      ["an unknown number of a closed enum in editions", "editions.E", "2807", {
        b: 0,
        c: [],
        [unknownFields]: bytes("2807")
      }],
      ["invalid UTF-8 without validation", "legacy.Legacy", "0801 1201ff", { ...legacyZeros, id: 1, name: "�" }]
    ]
    for (const [name, typeName, hex, value] of cases) {
      it(name, () => {
        assert.deepStrictEqual(decode(typeName, hex), value)
      })
    }
  })

  it("writes unknown fields back, last", () => {
    const value = decode("test.Shape", "0a0161 f80701 1a00")
    assert.strictEqual(encode("test.Shape", value), "0a0161 1a00 f80701".replaceAll(" ", ""))
  })

  it("drops unknown fields with readUnknownFields: false and writeUnknownFields: false", () => {
    assert.deepStrictEqual(decode("test.Point", "f80701", { readUnknownFields: false }), { x: 0, y: 0 })
    assert.strictEqual(encode("test.Point", { [unknownFields]: bytes("f80701") }, { writeUnknownFields: false }), "")
  })

  describe("fails to decode", () => {
    const cases: ReadonlyArray<readonly [string, string, string, string, ReadonlyArray<PropertyKey>]> = [
      ["a truncated varint", "test.Point", "08", "x: Expected a complete value at offset 1", ["x"]],
      ["invalid UTF-8", "test.Shape", "0a01ff", "name: Expected valid UTF-8 at offset 2", ["name"]],
      [
        "a value past the end of its message",
        "test.Shape",
        "1201 0801",
        "origin.x: Expected a complete value at offset 3",
        [
          "origin",
          "x"
        ]
      ],
      ["a list element", "test.Shape", "1a02 0801 1a01 08", "points[1].x: Expected a complete value at offset 7", [
        "points",
        1,
        "x"
      ]],
      [
        "a partial packed double",
        "test.Shape",
        "3a09 000000000000f03f 01",
        "weights: Expected a complete value at offset 10",
        [
          "weights"
        ]
      ],
      ["a missing required field", "legacy.Legacy", "1200", "Expected required field id of legacy.Legacy", []],
      [
        "a stray end group tag",
        "test.Point",
        "3c",
        "Expected a start group tag before the end group tag of field 7",
        []
      ]
    ]
    for (const [name, typeName, hex, message_, path] of cases) {
      it(name, () => {
        assert.deepStrictEqual(failure(ProtobufMessage.decode(message(typeName))(bytes(hex))), {
          message: message_,
          path
        })
      })
    }

    it("messages nested deeper than maxDepth", () => {
      const tree = { children: [{ children: [{ children: [] }] }] }
      const encoded = Result.getOrThrow(ProtobufMessage.encode(message("test.Tree"))(tree))
      assert.deepStrictEqual(failure(ProtobufMessage.decode(message("test.Tree"), { maxDepth: 1 })(encoded)), {
        message: "children[0].children[0]: Expected messages nested at most 1 deep",
        path: ["children", 0, "children", 0]
      })
    })
  })

  describe("fails to encode", () => {
    const cases: ReadonlyArray<readonly [string, string, unknown, string, ReadonlyArray<PropertyKey>]> = [
      ["a value of another type", "test.Shape", { name: 1 }, "name: Expected a string, got 1", ["name"]],
      [
        "a list element",
        "test.Shape",
        { points: [{ x: 1 }, { x: 1.5 }] },
        "points[1].x: Expected an integer for an int32, got 1.5",
        [
          "points",
          1,
          "x"
        ]
      ],
      ["a packed element", "test.Shape", { ids: [1, "2"] }, "ids[1]: Expected an integer for an int32, got \"2\"", [
        "ids",
        1
      ]],
      [
        "an unknown oneof case",
        "test.Shape",
        { kind: { _tag: "nope", value: 1 } },
        "kind: Expected a case of oneof kind, got \"nope\"",
        [
          "kind"
        ]
      ],
      ["a map value", "test.Shape", { counts: { a: "x" } }, "counts.a: Expected an integer for an int32, got \"x\"", [
        "counts",
        "a"
      ]],
      ["a map key", "test.Shape", { byId: { x: "a" } }, "byId.x: Expected an integer key for an int64, got \"x\"", [
        "byId",
        "x"
      ]],
      ["a uint64 out of range", "test.Scalars", { uint64: -1n }, "uint64: Expected a uint64 in range, got -1n", [
        "uint64"
      ]],
      [
        "a float out of range",
        "test.Scalars",
        { float: 1e39 },
        "float: Expected a number in the range of a float, got 1e+39",
        [
          "float"
        ]
      ],
      ["a missing required field", "legacy.Legacy", {}, "id: Expected a value for required field id", ["id"]],
      ["something other than an object", "test.Point", null, "Expected an object for test.Point, got null", []]
    ]
    for (const [name, typeName, value, message_, path] of cases) {
      it(name, () => {
        assert.deepStrictEqual(
          failure(ProtobufMessage.encode(message(typeName))(value as ProtobufMessage.Message)),
          { message: message_, path }
        )
      })
    }
  })

  describe("extensions", () => {
    const priority = registry.getExtension("legacy.priority")!
    const labels = registry.getExtension("legacy.labels")!
    const member = registry.getExtension("legacy.SetMember.member")!

    it("sets, replaces and clears an extension in the unknown fields", () => {
      const set = Result.getOrThrow(ProtobufMessage.setExtension({ id: 1 }, priority, 3))
      assert.strictEqual(encode("legacy.Legacy", set), "0801a00603")
      assert.strictEqual(Result.getOrThrow(ProtobufMessage.getExtension(set, priority)), 3)
      const replaced = Result.getOrThrow(ProtobufMessage.setExtension(set, priority, 4))
      assert.deepStrictEqual(replaced[unknownFields], bytes("a00604"))
      const cleared = Result.getOrThrow(ProtobufMessage.setExtension(replaced, priority, undefined))
      assert.isFalse(unknownFields in cleared)
      assert.isUndefined(Result.getOrThrow(ProtobufMessage.getExtension(cleared, priority)))
    })

    it("reads an extension of decoded bytes", () => {
      assert.strictEqual(
        Result.getOrThrow(ProtobufMessage.getExtension(decode("legacy.Legacy", "0801 a00603"), priority)),
        3
      )
    })

    it("reads and writes a repeated extension", () => {
      assert.deepStrictEqual(Result.getOrThrow(ProtobufMessage.getExtension({ id: 1 }, labels)), [])
      const set = Result.getOrThrow(ProtobufMessage.setExtension({ id: 1 }, labels, ["a", "b"]))
      assert.deepStrictEqual(set[unknownFields], bytes("aa060161 aa060162"))
      assert.deepStrictEqual(Result.getOrThrow(ProtobufMessage.getExtension(set, labels)), ["a", "b"])
    })

    it("writes the extensions of a MessageSet as items", () => {
      const set = Result.getOrThrow(ProtobufMessage.setExtension({}, member, { text: "a" }))
      assert.deepStrictEqual(set[unknownFields], bytes("0b 10e807 1a030a0161 0c"))
      assert.deepStrictEqual(Result.getOrThrow(ProtobufMessage.getExtension(set, member)), { text: "a" })
    })

    it("fails for a value of another type", () => {
      assert.deepStrictEqual(failure(ProtobufMessage.setExtension({}, priority, "x")), {
        message: "priority: Expected an integer for an int32, got \"x\"",
        path: ["priority"]
      })
    })
  })
})
