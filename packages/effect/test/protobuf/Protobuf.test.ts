/** @effect-diagnostics schemaNumber:off */
import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, DateTime, Duration, Option, Result, Schema } from "effect"
import * as Hex from "effect/encoding/Hex"
import * as Protobuf from "effect/protobuf/Protobuf"

const bytes = (hex: string): Uint8Array<ArrayBuffer> =>
  Result.getOrThrow(Hex.decode(hex.replaceAll(" ", ""))) as Uint8Array<ArrayBuffer>

const encode = <A, I>(schema: Schema.Codec<A, I>, value: A): string =>
  Hex.encode(Schema.encodeUnknownSync(Protobuf.toCodec(schema))(value))

const decode = <A, I>(schema: Schema.Codec<A, I>, hex: string): A =>
  Schema.decodeUnknownSync(Protobuf.toCodec(schema))(bytes(hex))

const f = Protobuf.field

const message = <const Fields extends Schema.Struct.Fields>(fields: Fields) =>
  Protobuf.Message("test.v1.Message", fields)

// The schemas mirror these protos.
//
// // acme/v1/kitchen_sink.proto
// message Scalars { double f_double = 1; float f_float = 2; int32 f_int32 = 3; int64 f_int64 = 4;
//   uint32 f_uint32 = 5; uint64 f_uint64 = 6; sint32 f_sint32 = 7; sint64 f_sint64 = 8;
//   fixed32 f_fixed32 = 9; fixed64 f_fixed64 = 10; sfixed32 f_sfixed32 = 11; sfixed64 f_sfixed64 = 12;
//   bool f_bool = 13; string f_string = 14; bytes f_bytes = 15; }
// enum Color { COLOR_UNSPECIFIED = 0; COLOR_RED = 1; COLOR_GREEN = 2; COLOR_BLUE = 3; }
// message Point { int32 x = 1; int32 y = 2; }
// message Shapes {
//   message Circle { Point center = 1; double radius = 2; }
//   repeated int32 numbers = 1; repeated string names = 2; repeated Point points = 3;
//   repeated Color colors = 4; map<string, int32> counts = 5; map<int32, string> labels = 6;
//   map<string, Point> named_points = 7; optional string nickname = 8; optional int32 maybe_number = 9;
//   Point origin = 10; Color primary = 11;
//   oneof shape { Circle circle = 12; Point square_corner = 13; string label = 14; int64 code = 15; } }
// message WellKnown { google.protobuf.Timestamp created_at = 1; google.protobuf.Duration ttl = 2;
//   google.protobuf.StringValue maybe_text = 3; google.protobuf.Int32Value maybe_int = 4;
//   google.protobuf.BoolValue maybe_bool = 5; google.protobuf.Struct attributes = 6;
//   google.protobuf.Value anything = 7; google.protobuf.Empty nothing = 8; }
// message TreeNode { string name = 1; repeated TreeNode children = 2; }
//
// // test/v1/extra.proto
// message Unpacked { repeated int32 values = 1 [packed = false]; repeated sint64 zigzag = 2; }
// message Keys { map<int64, string> by_id = 1; map<bool, int32> flags = 2; map<uint32, acme.v1.Point> points = 3; }
// message Status { enum State { STATE_UNSPECIFIED = 0; STATE_ACTIVE = 1; STATE_SUSPENDED = 2; } }
// message Pick { oneof choice { string text = 1; int32 number = 2; acme.v1.Point point = 3; } }
// message Wide { string text = 1; acme.v1.Point point = 2; int32 high = 536870911; }
// message Doubles { double value = 1; }
// message Numbers { int64 signed = 1 [jstype = JS_NUMBER]; uint64 unsigned = 2 [jstype = JS_NUMBER]; }
//
// // test/v2/legacy.proto (proto2)
// message Legacy {
//   required int32 id = 1;
//   optional group Item = 2 { optional string name = 3; }
//   repeated group Entry = 4 { optional int32 n = 5; } }
// message Product { optional string name = 1; extensions 100 to 199; }
// extend Product { optional int32 priority = 100; repeated string tags = 101; }

const Point = Protobuf.Message("acme.v1.Point", {
  x: Protobuf.Int32.pipe(f(1)),
  y: Protobuf.Int32.pipe(f(2))
})

const Scalars = message({
  fDouble: Protobuf.Double.pipe(f(1)),
  fFloat: Protobuf.Float.pipe(f(2)),
  fInt32: Protobuf.Int32.pipe(f(3)),
  fInt64: Protobuf.Int64.pipe(f(4)),
  fUint32: Protobuf.UInt32.pipe(f(5)),
  fUint64: Protobuf.UInt64.pipe(f(6)),
  fSint32: Protobuf.SInt32.pipe(f(7)),
  fSint64: Protobuf.SInt64.pipe(f(8)),
  fFixed32: Protobuf.Fixed32.pipe(f(9)),
  fFixed64: Protobuf.Fixed64.pipe(f(10)),
  fSfixed32: Protobuf.SFixed32.pipe(f(11)),
  fSfixed64: Protobuf.SFixed64.pipe(f(12)),
  fBool: Schema.Boolean.pipe(f(13)),
  fString: Schema.String.pipe(f(14)),
  fBytes: Schema.Uint8Array.pipe(f(15))
})

const Color = Protobuf.Enum("acme.v1.Color", {
  unspecified: 0,
  red: 1,
  green: 2,
  blue: 3
})

const Circle = message({
  center: Schema.optionalKey(Point).pipe(f(1)),
  radius: Protobuf.Double.pipe(f(2))
})

const Shapes = message({
  numbers: Schema.Array(Protobuf.Int32).pipe(f(1)),
  names: Schema.Array(Schema.String).pipe(f(2)),
  points: Schema.Array(Point).pipe(f(3)),
  colors: Schema.Array(Color).pipe(f(4)),
  counts: Protobuf.Map(Schema.String, Protobuf.Int32).pipe(f(5)),
  labels: Protobuf.Map(Protobuf.Int32, Schema.String).pipe(f(6)),
  namedPoints: Protobuf.Map(Schema.String, Point).pipe(f(7)),
  nickname: Schema.optionalKey(Schema.String).pipe(f(8)),
  maybeNumber: Schema.optionalKey(Protobuf.Int32).pipe(f(9)),
  origin: Schema.optionalKey(Point).pipe(f(10)),
  primary: Color.pipe(f(11)),
  shape: Protobuf.Oneof({
    circle: Circle.pipe(f(12)),
    squareCorner: Point.pipe(f(13)),
    label: Schema.String.pipe(f(14)),
    code: Protobuf.Int64.pipe(f(15))
  })
})

const WellKnown = message({
  createdAt: Schema.optionalKey(Protobuf.Timestamp).pipe(f(1)),
  ttl: Schema.optionalKey(Protobuf.Duration).pipe(f(2)),
  maybeText: Schema.optionalKey(Protobuf.StringValue).pipe(f(3)),
  maybeInt: Schema.optionalKey(Protobuf.Int32Value).pipe(f(4)),
  maybeBool: Schema.optionalKey(Protobuf.BoolValue).pipe(f(5)),
  attributes: Schema.optionalKey(Protobuf.Struct).pipe(f(6)),
  anything: Schema.optionalKey(Protobuf.Value).pipe(f(7)),
  nothing: Schema.optionalKey(Protobuf.Empty).pipe(f(8))
})

interface TreeNode {
  readonly name: string
  readonly children: ReadonlyArray<TreeNode>
}

const TreeNode: Schema.Codec<TreeNode> = message({
  name: Schema.String.pipe(f(1)),
  children: Schema.Array(Schema.suspend((): Schema.Codec<TreeNode> => TreeNode)).pipe(f(2))
})

const Unpacked = message({
  values: Schema.Array(Protobuf.Int32).pipe(f(1, { packed: false })),
  zigzag: Schema.Array(Protobuf.SInt64).pipe(f(2))
})

const Keys = message({
  byId: Protobuf.Map(Protobuf.Int64String, Schema.String).pipe(f(1)),
  flags: Protobuf.Map(Protobuf.BoolKey, Protobuf.Int32).pipe(f(2)),
  points: Protobuf.Map(Protobuf.UInt32, Point).pipe(f(3))
})

const State = Protobuf.Enum("test.v1.Status.State", {
  unspecified: 0,
  active: 1,
  suspended: 2
})

const Pick = message({
  choice: Protobuf.Oneof({
    text: Schema.String.pipe(f(1)),
    number: Protobuf.Int32.pipe(f(2)),
    point: Point.pipe(f(3))
  })
})

const Wide = message({
  text: Schema.String.pipe(f(1)),
  point: Schema.optionalKey(Point).pipe(f(2)),
  high: Protobuf.Int32.pipe(f(536870911))
})

const Doubles = message({ value: Protobuf.Double.pipe(f(1)) })

const Numbers = message({
  signed: Protobuf.Int64Number.pipe(f(1)),
  unsigned: Protobuf.UInt64Number.pipe(f(2))
})

const Legacy = message({
  id: Protobuf.Int32.pipe(f(1, { required: true })),
  item: Schema.optionalKey(message({ name: Schema.optionalKey(Schema.String).pipe(f(3)) }))
    .pipe(f(2, { delimited: true })),
  entry: Schema.Array(message({ n: Schema.optionalKey(Protobuf.Int32).pipe(f(5)) }))
    .pipe(f(4, { delimited: true }))
})

const Keeper = Protobuf.Message("test.v1.Keeper", { x: Protobuf.Int32.pipe(f(1)) })

const Labeled = message({ label: Schema.String.pipe(f(1)), point: Point.pipe(f(2)) })

const Choice = message({
  choice: Protobuf.Oneof({ labeled: Labeled.pipe(f(1)), text: Schema.String.pipe(f(2)) })
})

const Product = Protobuf.Message("test.v2.Product", { name: Schema.optionalKey(Schema.String).pipe(f(1)) })

const priority = Protobuf.extension(Product, 100, Protobuf.Int32)
const tags = Protobuf.extension(Product, 101, Schema.Array(Schema.String))

const zeroScalars = {
  fDouble: 0,
  fFloat: 0,
  fInt32: 0,
  fInt64: 0n,
  fUint32: 0,
  fUint64: 0n,
  fSint32: 0,
  fSint64: 0n,
  fFixed32: 0,
  fFixed64: 0n,
  fSfixed32: 0,
  fSfixed64: 0n,
  fBool: false,
  fString: "",
  fBytes: new Uint8Array(0)
}

const emptyShapes = {
  numbers: [],
  names: [],
  points: [],
  colors: [],
  counts: {},
  labels: {},
  namedPoints: {},
  primary: "unspecified"
} as const

// The `google.protobuf.Value` message of a JSON value, and the `Struct` of an
// object of them.
const value = (json: Schema.Json): Protobuf.Value => {
  if (json === null) return { kind: { _tag: "nullValue", value: "NULL_VALUE" } }
  switch (typeof json) {
    case "number":
      return { kind: { _tag: "numberValue", value: json } }
    case "string":
      return { kind: { _tag: "stringValue", value: json } }
    case "boolean":
      return { kind: { _tag: "boolValue", value: json } }
  }
  return Array.isArray(json)
    ? { kind: { _tag: "listValue", value: { values: json.map(value) } } }
    : { kind: { _tag: "structValue", value: struct(json as { readonly [key: string]: Schema.Json }) } }
}
const struct = (json: { readonly [key: string]: Schema.Json }): Protobuf.Struct => ({
  fields: Object.fromEntries(Object.entries(json).map(([key, v]) => [key, value(v)]))
})

// Runs `f`, and returns its value or whether it failed.
const attempt = (f: () => unknown): { readonly value: unknown } | { readonly error: string } => {
  try {
    return { value: f() }
  } catch (e) {
    return { error: String(e) }
  }
}

// A check that changes nothing, but keeps a schema off the fast path.
const inert = <S extends Schema.Top>(schema: S): S["Rebuild"] => schema.check(Schema.makeFilter(() => true))

describe("Protobuf", () => {
  // Produced with `toBinary(desc, create(desc, init))` from @bufbuild/protobuf
  // 2.16.0 for the protos above, with `init` mirroring each value.
  describe("writes and reads the bytes of @bufbuild/protobuf", () => {
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, string]> = [
      ["scalars at zero", Scalars, zeroScalars, ""],
      [
        "scalars at their extremes",
        Scalars,
        {
          fDouble: -1.5e300,
          fFloat: 1.5,
          fInt32: -2147483648,
          fInt64: -9223372036854775808n,
          fUint32: 4294967295,
          fUint64: 18446744073709551615n,
          fSint32: -1,
          fSint64: -9223372036854775808n,
          fFixed32: 4294967295,
          fFixed64: 18446744073709551615n,
          fSfixed32: -2147483648,
          fSfixed64: -1n,
          fBool: true,
          fString: "héllo ✓",
          fBytes: new Uint8Array([0, 255, 7])
        },
        "09355800662deb41fe 150000c03f 1880808080f8ffffffff01 2080808080808080808001 28ffffffff0f 30ffffffffffffffffff01 3801 40ffffffffffffffffff01 4dffffffff 51ffffffffffffffff 5d00000080 61ffffffffffffffff 6801 720a68c3a96c6c6f20e29c93 7a0300ff07"
      ],
      [
        "repeated, maps, presence and a oneof message case",
        Shapes,
        {
          numbers: [1, -2, 300],
          names: ["a", ""],
          points: [{ x: 1, y: 2 }, { x: 0, y: 0 }],
          colors: ["red", "unspecified", "blue"],
          counts: { a: 1, b: 0 },
          labels: { 1: "one", [-5]: "minus five" },
          namedPoints: { o: { x: 0, y: 0 } },
          nickname: "",
          maybeNumber: 0,
          origin: { x: 0, y: 0 },
          primary: "green",
          shape: { _tag: "circle", value: { center: { x: 1, y: 1 }, radius: 2.5 } }
        },
        "0a0d01feffffffffffffffff01ac02 12016112 00 1a0408011002 1a00 22030100 03 2a050a0161 1001 2a050a01621000 3207080112036f6e65 321708fbffffffffffffffff01120a6d696e757320666976 65 3a050a016f1200 4200 4800 5200 5802 620f0a0408011001110000000000000440"
      ],
      [
        "well-known types",
        WellKnown,
        {
          createdAt: DateTime.makeUnsafe(1700000000123),
          ttl: Duration.millis(-1500),
          maybeText: "",
          maybeInt: 0,
          maybeBool: true,
          attributes: struct({ a: 1, b: [true, null, "x"], c: { d: {} } }),
          anything: value("str"),
          nothing: {}
        },
        "0a0b0880e2cfaa0610c0a9d33a 121608ffffffffffffffffff011080b6ca91feffffffff01 1a00 2200 2a020801 32380a0e0a0161120911000000000000f03f0a140a0162120f320d0a0220010a0208000a031a01780a100a0163120b2a090a070a016412022a00 3a051a03737472 4200"
      ],
      ["a recursive message", TreeNode, {
        name: "root",
        children: [{ name: "a", children: [] }, { name: "b", children: [{ name: "c", children: [] }] }]
      }, "0a04726f6f74 12030a0161 12080a016212030a0163"],
      ["unpacked and zigzag repeated fields", Unpacked, {
        values: [1, -1, 300],
        zigzag: [-1n, 1n, -64n]
      }, "0801 08ffffffffffffffffff01 08ac02 120301027f"],
      [
        "64-bit, bool and integer map keys",
        Keys,
        {
          byId: { "-5": "a", "9007199254740993": "b" },
          flags: { true: 1, false: 0 },
          points: { 7: { x: 1, y: 2 } }
        },
        "0a0e08fbffffffffffffffff01120161 0a0c088180808080808010120162 120408011001 120408001000 1a080807120408011002"
      ],
      ["a oneof case holding its zero value", Pick, { choice: { _tag: "number", value: 0 } }, "1000"],
      ["long length prefixes and the highest field number", Wide, {
        text: "x".repeat(200),
        point: { x: 1, y: 0 },
        high: 7
      }, `0ac801${"78".repeat(200)} 12020801 f8ffffff0f07`],
      ["negative zero", Doubles, { value: -0 }, "090000000000000080"],
      [
        "64-bit integers as numbers and strings",
        message({
          sint64: Protobuf.SInt64Number.pipe(f(1)),
          fixed64: Protobuf.Fixed64Number.pipe(f(2)),
          sfixed64: Protobuf.SFixed64Number.pipe(f(3)),
          int64: Protobuf.Int64String.pipe(f(4)),
          uint64: Protobuf.UInt64String.pipe(f(5)),
          sint64s: Schema.Array(Protobuf.SInt64String).pipe(f(6)),
          fixed64s: Schema.Array(Protobuf.Fixed64String).pipe(f(7)),
          sfixed64s: Schema.Array(Protobuf.SFixed64String).pipe(f(8)),
          int64Number: Protobuf.Int64Number.pipe(f(9)),
          uint64Number: Protobuf.UInt64Number.pipe(f(10))
        }),
        {
          sint64: -1,
          fixed64: Number.MAX_SAFE_INTEGER,
          sfixed64: -2,
          int64: "-9223372036854775808",
          uint64: "18446744073709551615",
          sint64s: ["-1", "0"],
          fixed64s: ["1"],
          sfixed64s: ["-1"],
          int64Number: -1,
          uint64Number: Number.MAX_SAFE_INTEGER
        },
        "0801 11ffffffffffff1f00 19feffffffffffffff 2080808080808080808001 28ffffffffffffffffff01 32020100 3a080100000000000000 4208ffffffffffffffff 48ffffffffffffffffff01 50ffffffffffffff0f"
      ],
      [
        "a NullValue",
        message({ n: Protobuf.NullValue.pipe(f(1)), r: Schema.Array(Protobuf.NullValue).pipe(f(2)) }),
        {
          n: "NULL_VALUE",
          r: ["NULL_VALUE", 3]
        },
        "12020003"
      ],
      [
        "a TimestampParts root",
        Protobuf.TimestampParts,
        { seconds: -2n, nanos: 500_000_000 },
        "08feffffffffffffffff01 1080cab5ee01"
      ],
      [
        "a Timestamp root",
        Protobuf.Timestamp,
        DateTime.makeUnsafe(-1500),
        "08feffffffffffffffff01 1080cab5ee01"
      ],
      ["a Duration root", Protobuf.Duration, Duration.nanos(1_000_000_500n), "0801 10f403"],
      // seconds 1, nanos -1: of the other sign, which Duration rejects.
      ["a DurationParts root", Protobuf.DurationParts, { seconds: 1n, nanos: -1 }, "0801 10ffffffffffffffffff01"],
      [
        "the longest Duration",
        Protobuf.Duration,
        Duration.nanos(315_576_000_000_999_999_999n),
        "0880bcaece9709 10ff93ebdc03"
      ],
      ["a StringValue root", Protobuf.StringValue, "a", "0a0161"],
      ["a FieldMask root", Protobuf.FieldMask, ["a.b", "c"], "0a03612e62 0a0163"],
      [
        "a Value root",
        Protobuf.Value,
        value({ a: [1, "x", null, true] }),
        "2a210a1f0a0161121a32180a0911000000000000f03f0a031a01780a0208000a022001"
      ],
      ["a null Value", WellKnown, { anything: value(null) }, "3a020800"],
      [
        "an Any root",
        Protobuf.Any,
        { typeUrl: "type.googleapis.com/acme.v1.Point", value: bytes("0801") },
        "0a21747970652e676f6f676c65617069732e636f6d2f61636d652e76312e506f696e74 12020801"
      ],
      [
        "proto2 required fields and groups",
        Legacy,
        { id: 0, item: { name: "x" }, entry: [{ n: 1 }, { n: 2 }] },
        "0800 13 1a0178 14 23 2801 24 23 2802 24"
      ],
      [
        "unknown fields, kept and written back",
        Protobuf.Message("test.v1.Unknown", { fDouble: Protobuf.Double.pipe(f(1)) }),
        { fDouble: 1, [Protobuf.unknown]: bytes("18ffffffffffffffffff01 720173") },
        "09000000000000f03f 18ffffffffffffffffff01 720173"
      ],
      [
        "extensions",
        Product,
        Protobuf.setExtension(Protobuf.setExtension({ name: "lamp" }, priority, 3), tags, ["a", "b"]),
        "0a046c616d70 a00603 aa060161 aa060162"
      ]
    ]
    for (const [name, schema, value, hex] of cases) {
      it(name, () => {
        assert.strictEqual(encode(schema, value), hex.replaceAll(" ", ""))
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }
  })

  // Each scalar type and packed field has its own encoding and decoding path;
  // generated values cover their edges, such as -0 and the 64-bit bounds.
  const Numeric = message({
    int32: Protobuf.Int32.pipe(f(1)),
    uint32: Protobuf.UInt32.pipe(f(2)),
    sint32: Protobuf.SInt32.pipe(f(3)),
    fixed32: Protobuf.Fixed32.pipe(f(4)),
    sfixed32: Protobuf.SFixed32.pipe(f(5)),
    int64: Protobuf.Int64.pipe(f(6)),
    uint64: Protobuf.UInt64.pipe(f(7)),
    sint64: Protobuf.SInt64.pipe(f(8)),
    fixed64: Protobuf.Fixed64.pipe(f(9)),
    sfixed64: Protobuf.SFixed64.pipe(f(10)),
    double: Protobuf.Double.pipe(f(11)),
    doubles: Schema.Array(Protobuf.Double).pipe(f(12)),
    int32s: Schema.Array(Protobuf.Int32).pipe(f(13)),
    sint32s: Schema.Array(Protobuf.SInt32).pipe(f(14)),
    int64s: Schema.Array(Protobuf.Int64).pipe(f(15)),
    sint64s: Schema.Array(Protobuf.SInt64).pipe(f(16)),
    uint64s: Schema.Array(Protobuf.UInt64).pipe(f(17))
  })

  it.prop("round-trips numeric fields", [Numeric], ([value]) => {
    const codec = Protobuf.toCodec(Numeric)
    assert.deepStrictEqual(Schema.decodeSync(codec)(Schema.encodeSync(codec)(value)), value)
  })

  it("normalizes integer negative zero", () => {
    const schema = message({ value: Protobuf.Int32.pipe(f(1)) })
    assert.isTrue(Object.is(decode(schema, encode(schema, { value: -0 })).value, 0))
  })

  describe("decodes", () => {
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, string, unknown]> = [
      ["a packed field declared unpacked", Unpacked, "0a03010203", { values: [1, 2, 3], zigzag: [] }],
      ["an unpacked field declared packed", Unpacked, "1001 1002", { values: [], zigzag: [-1n, 1n] }],
      ["the last occurrence of a scalar", Point, "0801 0802", { x: 2, y: 0 }],
      ["the last occurrence of a oneof", Pick, "0a026869 1005", { choice: { _tag: "number", value: 5 } }],
      ["merged occurrences of a message", Wide, "12020801 12021002", { text: "", point: { x: 1, y: 2 }, high: 0 }],
      [
        "unknown fields of every wire type, groups included",
        Point,
        "1801 210000000000000000 2a0161 3500000000 3b08013c 0805",
        { x: 5, y: 0, [Protobuf.unknown]: bytes("1801 210000000000000000 2a0161 3500000000 3b08013c") }
      ],
      [
        "a Timestamp to millisecond precision",
        Protobuf.Timestamp,
        "0801 10e0c65b",
        DateTime.makeUnsafe(1001)
      ],
      ["a delimited field sent length-prefixed", Legacy, "0800 12031a0178", { id: 0, item: { name: "x" }, entry: [] }],
      [
        "unknown fields of merged occurrences",
        message({ keeper: Keeper.pipe(f(1)) }),
        "0a021801 0a00 0a021802",
        { keeper: { x: 0, [Protobuf.unknown]: bytes("1801 1802") } }
      ],
      // A partial first occurrence lacks a required field, and still merges.
      ["merged occurrences of a oneof case", Choice, "0a030a0161 0a0412020801", {
        choice: { _tag: "labeled", value: { label: "a", point: { x: 1, y: 0 } } }
      }],
      ["a oneof case after another case, unmerged", Choice, "0a030a0161 120162 0a0412020801", {
        choice: { _tag: "labeled", value: { label: "", point: { x: 1, y: 0 } } }
      }],
      ["well-known types and wrappers sent as groups", WellKnown, "0b08050c 1b0a01611c 3b20013c", {
        createdAt: DateTime.makeUnsafe(5000),
        maybeText: "a",
        anything: value(true)
      }],
      // An out-of-range Timestamp is only rejected if it is the final value.
      [
        "merged occurrences of a Timestamp, out of range before the last one",
        message({ at: Protobuf.Timestamp.pipe(f(1)) }),
        "0a06108094ebdc03 0a021000",
        { at: DateTime.makeUnsafe(0) }
      ],
      ["a Timestamp past unknown fields", Protobuf.Timestamp, "1801 0805", DateTime.makeUnsafe(5000)],
      [
        "merged occurrences of well-known types and wrappers",
        WellKnown,
        "0a020805 0a0410c0843d 12020805 120410c0843d 1a030a0161 1a00 32100a0e0a0161120911000000000000f03f 32090a070a016212022001",
        {
          createdAt: DateTime.makeUnsafe(5001),
          ttl: Duration.millis(5001),
          maybeText: "a",
          attributes: struct({ a: 1, b: true })
        }
      ],
      [
        "invalid UTF-8 with replacement characters, without validation",
        message({ text: Schema.String.pipe(f(1, { validateUtf8: false })) }),
        "0a0261ff",
        { text: "a\ufffd" }
      ]
    ]
    for (const [name, schema, hex, value] of cases) {
      it(name, () => {
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }

    it("objects with their keys in schema order", () => {
      const Ordered = message({
        a: Schema.optionalKey(Schema.String).pipe(f(3)),
        point: Point.pipe(f(1)),
        b: Protobuf.Int32.pipe(f(2))
      })
      // The fields arrive in field-number order, then `a` again.
      assert.deepStrictEqual(Object.keys(decode(Ordered, "0a020801 1001 1a0161")), ["a", "point", "b"])
      assert.deepStrictEqual(Object.keys(decode(inert(Ordered), "0a020801 1001 1a0161")), ["a", "point", "b"])
    })
  })

  // A closed enum keeps a field with an unknown number as an unknown field, as
  // the C++ and Java implementations do. @bufbuild/protobuf does so only for
  // singular fields.
  describe("enums", () => {
    const Closed = Protobuf.Enum("test.v1.Closed", { a: 0, b: 1 })
    const Open = Protobuf.OpenEnum("test.v1.Open", { a: 0, b: 1 })
    const Enums = Protobuf.Message("test.v1.Enums", {
      e: Closed.pipe(f(1)),
      r: Schema.Array(Closed).pipe(f(2, { packed: false })),
      p: Schema.Array(Closed).pipe(f(3)),
      m: Protobuf.Map(Schema.String, Closed).pipe(f(4)),
      o: Open.pipe(f(5))
    })
    const empty = { e: "a", r: [], p: [], m: {}, o: "a" } as const
    const cases: ReadonlyArray<readonly [string, string, unknown]> = [
      ["a singular field, keeping its value", "0801 0807", { ...empty, e: "b", [Protobuf.unknown]: bytes("0807") }],
      ["an unpacked element", "1001 1007 1000", { ...empty, r: ["b", "a"], [Protobuf.unknown]: bytes("1007") }],
      ["a packed element, as an unpacked field", "1a03010700", {
        ...empty,
        p: ["b", "a"],
        [Protobuf.unknown]: bytes("1807")
      }],
      ["a map entry", "22050a01611007 22050a01621001", {
        ...empty,
        m: { b: "b" },
        [Protobuf.unknown]: bytes("22050a01611007")
      }]
    ]
    for (const [name, hex, value] of cases) {
      it(`decodes an unknown number of ${name}`, () => {
        assert.deepStrictEqual(decode(Enums, hex), value)
      })
    }

    it("reads and writes the numbers of an open enum", () => {
      assert.strictEqual(encode(Enums, { ...empty, o: 7 }), "2807")
      assert.deepStrictEqual(decode(Enums, "2807"), { ...empty, o: 7 })
    })

    it("decodes aliases to the first name", () => {
      const Aliased = message({
        e: Protobuf.Enum("test.v1.Aliased", { unknown: 0, started: 1, running: 1 }).pipe(f(1))
      })
      assert.strictEqual(encode(Aliased, { e: "running" }), "0801")
      assert.deepStrictEqual(decode(Aliased, "0801"), { e: "started" })
    })

    it("decodes an absent field of a closed enum without 0 to its first value", () => {
      const Explicit = message({
        m: Protobuf.Map(Schema.String, Protobuf.Enum("test.v1.Level", { low: 1, high: 2 })).pipe(f(1))
      })
      assert.deepStrictEqual(decode(Explicit, "0a030a0161"), { m: { a: "low" } })
    })
  })

  describe("extensions", () => {
    it("reads, writes and clears them", () => {
      const product = Protobuf.setExtension({ name: "lamp" }, priority, 3)
      assert.deepStrictEqual(Protobuf.getExtension(product, priority), Option.some(3))
      assert.deepStrictEqual(Protobuf.getExtension(product, tags), Option.none())
      assert.isTrue(Protobuf.hasExtension(product, priority))
      const replaced = Protobuf.setExtension(product, priority, 4)
      assert.deepStrictEqual(Protobuf.getExtension(replaced, priority), Option.some(4))
      assert.deepStrictEqual(Protobuf.clearExtension(replaced, priority), { name: "lamp" })
    })

    it("merges occurrences of an extension from the wire", () => {
      const product = decode(Product, "a00603 aa060161 0a01 78 aa060162 a00605")
      assert.deepStrictEqual(Protobuf.getExtension(product, priority), Option.some(5))
      assert.deepStrictEqual(Protobuf.getExtension(product, tags), Option.some(["a", "b"]))
    })

    it("rejects extendees that are not messages", () => {
      assert.throws(
        () => Protobuf.extension(Protobuf.Duration, 100, Protobuf.Int32),
        /the extendee of extension 100 is not a Protobuf.Message/
      )
    })

    it("writes a value that is zero", () => {
      const product = Protobuf.setExtension({ name: "lamp" }, priority, 0)
      assert.strictEqual(Hex.encode(product[Protobuf.unknown]!), "a00600")
      assert.isTrue(Protobuf.hasExtension(product, priority))
      assert.deepStrictEqual(Protobuf.getExtension(product, priority), Option.some(0))
      // A closed enum without 0 has no implicit zero to skip.
      const level = Protobuf.extension(Product, 102, Protobuf.Enum("test.v2.Level", { LOW: 1 }))
      const leveled = Protobuf.setExtension({}, level, "LOW")
      assert.deepStrictEqual(Protobuf.getExtension(leveled, level), Option.some("LOW"))
    })

    it("checks the extensions of a registry when decoding", () => {
      const registry = Protobuf.registry(Product, priority, tags)
      const codec = Protobuf.toCodec(Product, { registry })
      // tags = 101: invalid UTF-8
      assert.throws(() => Schema.decodeUnknownSync(codec)(bytes("aa0601ff")), /invalid UTF-8/)
      assert.doesNotThrow(() => decode(Product, "aa0601ff"))
      const decoded = Schema.decodeUnknownSync(codec)(bytes("0a0161 a00603 aa060162"))
      assert.deepStrictEqual(decoded, { name: "a", [Protobuf.unknown]: bytes("a00603 aa060162") })
      assert.strictEqual(Protobuf.toCodec(Product, { registry }), codec)
    })

    it("reads and writes the items of a MessageSet", () => {
      const Set = Protobuf.MessageSet("test.v2.Set")
      const Item = message({ i: Protobuf.Int32.pipe(f(15)) })
      const item = Protobuf.extension(Set, 4135312, Item)
      const set = Protobuf.setExtension({}, item, { i: 99 })
      // group 1 { type_id = 4135312; message = { i: 99 } }
      assert.strictEqual(encode(Set, set), "0b1090b3fc011a0278630c")
      // An item with its message before its type id, and an item of another type.
      const decoded = decode(Set, "0b 1a02 7863 1090b3fc01 0c 0b 1001 1a00 0c")
      assert.deepStrictEqual(Protobuf.getExtension(decoded, item), Option.some({ i: 99 }))
      assert.strictEqual(Hex.encode(Protobuf.clearExtension(decoded, item)[Protobuf.unknown]!), "0b10011a000c")
      assert.throws(() => Protobuf.extension(Set, 5, Protobuf.Int32), /extends a MessageSet/)
    })

    it("fails for values the schema rejects", () => {
      assert.throws(() => Protobuf.getExtension(decode(Product, "aa0601ff"), tags), /invalid UTF-8/)
    })
  })

  describe("Any", () => {
    const Other = Protobuf.Message("acme.v1.Other", { x: Protobuf.Int32.pipe(f(1)) })

    it("packs and unpacks a message", () => {
      const any = Protobuf.anyPack(Point, { x: 1, y: 2 })
      assert.deepStrictEqual(any, { typeUrl: "type.googleapis.com/acme.v1.Point", value: bytes("08011002") })
      assert.isTrue(Protobuf.anyIs(any, Point))
      assert.isFalse(Protobuf.anyIs(any, Other))
      assert.deepStrictEqual(Protobuf.anyUnpack(any, Point), Option.some({ x: 1, y: 2 }))
      assert.deepStrictEqual(Protobuf.anyUnpack(any, Other), Option.none())
    })

    it("unpacks a message of a registry", () => {
      const imported = Protobuf.registry(Point)
      const registry = Protobuf.registry(Other, priority, imported)
      assert.deepStrictEqual([...registry.messages.keys()], ["acme.v1.Other", "acme.v1.Point"])
      assert.deepStrictEqual(registry.extensions.get("test.v2.Product"), [priority])
      const any = { typeUrl: "example.com/acme.v1.Point", value: bytes("0801") }
      assert.deepStrictEqual(Protobuf.anyUnpack(any, registry), Option.some({ x: 1, y: 0 }))
      assert.deepStrictEqual(Protobuf.anyUnpack({ ...any, typeUrl: "acme.v1.Missing" }, registry), Option.none())
    })

    it("packs and unpacks well-known types", () => {
      const ttl = Protobuf.anyPack(Protobuf.Duration, Duration.seconds(90))
      assert.deepStrictEqual(ttl, { typeUrl: "type.googleapis.com/google.protobuf.Duration", value: bytes("085a") })
      assert.deepStrictEqual(Protobuf.anyUnpack(ttl, Protobuf.Duration), Option.some(Duration.seconds(90)))
      assert.isFalse(Protobuf.anyIs(ttl, Protobuf.Timestamp))
      const text = Protobuf.anyPack(Protobuf.StringValue, "a")
      assert.strictEqual(text.typeUrl, "type.googleapis.com/google.protobuf.StringValue")
      const registry = Protobuf.registry(Protobuf.Duration, Protobuf.StringValue, Protobuf.Struct)
      assert.deepStrictEqual([...registry.messages.keys()], [
        "google.protobuf.Duration",
        "google.protobuf.StringValue",
        "google.protobuf.Struct"
      ])
      assert.deepStrictEqual(Protobuf.anyUnpack(text, registry), Option.some("a"))
    })

    it("rejects schemas that are not messages, and two messages of one name", () => {
      assert.throws(() => Protobuf.anyPack(Schema.String, "a"), /needs a message/)
      assert.throws(() => Protobuf.registry(Schema.String), /needs messages/)
      const Twin = Protobuf.Message("acme.v1.Point", {})
      assert.throws(() => Protobuf.registry(Point, Twin), /has two messages acme.v1.Point/)
    })
  })

  it("keeps unknown fields at $unknown, only when there are some", () => {
    assert.deepStrictEqual(Object.keys(decode(Keeper, "0805")), ["x"])
    assert.deepStrictEqual(Object.keys(decode(Keeper, "0805 1801")), ["x", "$unknown"])
  })

  it("derives the JSON codec and JSON Schema of Schema for a message", () => {
    const keeper = decode(Keeper, "0805 1801")
    const json = Schema.toCodecJson(Keeper)
    assert.deepStrictEqual(Schema.encodeSync(json)(keeper), { x: 5, $unknown: "GAE=" })
    assert.deepStrictEqual(Schema.decodeSync(json)({ x: 5, $unknown: "GAE=" }), keeper)
    assert.doesNotThrow(() => Schema.toJsonSchemaDocument(Keeper))
  })

  it("writes well-known types and wrappers delimited", () => {
    const Delimited = message({
      at: Protobuf.Timestamp.pipe(f(1, { delimited: true })),
      text: Protobuf.StringValue.pipe(f(2, { delimited: true }))
    })
    const value = { at: DateTime.makeUnsafe(5000), text: "a" }
    assert.strictEqual(encode(Delimited, value), "0b08050c130a016114")
    assert.deepStrictEqual(decode(Delimited, "0b08050c130a016114"), value)
  })

  // Absent bytes, repeated, and map fields share one empty value each, so that
  // small inputs cannot allocate one per field.
  it("decodes absent bytes, repeated, and map fields to frozen empty values", () => {
    const decoded = decode(message({ a: Scalars.fields.fBytes }), "")
    assert.deepStrictEqual(decoded, { a: new Uint8Array(0) })
    assert.isTrue(Object.isFrozen(decoded.a))
    const empty = decode(Shapes, "")
    assert.deepStrictEqual(empty, emptyShapes)
    assert.isTrue(Object.isFrozen(empty.numbers) && Object.isFrozen(empty.counts))
    assert.strictEqual<unknown>(empty.numbers, decode(Shapes, "").names)
    // A later occurrence of a message adds to a new array.
    const merged = decode(message({ s: Shapes.pipe(f(1)) }), "0a00 0a020801")
    assert.deepStrictEqual(merged.s.numbers, [1])
  })

  it("copies bytes fields out of a Node.js Buffer", () => {
    const input = Buffer.from(bytes("7a020102"))
    const decoded = Schema.decodeUnknownSync(Protobuf.toCodec(Scalars))(input)
    input[2] = 0xff
    assert.deepStrictEqual(decoded.fBytes, new Uint8Array([1, 2]))
  })

  // An assignment to `__proto__` replaces the prototype, so these keys must be
  // defined as own properties. `JSON.parse` builds the expected values for the
  // same reason.
  describe("keeps __proto__ keys as own properties", () => {
    const Guarded = message({
      ["__proto__"]: Schema.optionalKey(Protobuf.Map(Schema.String, Schema.String)).pipe(f(1))
    })
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, string]> = [
      [
        "a map key",
        Shapes,
        { ...emptyShapes, namedPoints: JSON.parse(`{"__proto__":{"x":1,"y":0}}`) },
        "3a0f 0a095f5f70726f746f5f5f 12020801"
      ],
      [
        "a Struct key",
        WellKnown,
        { attributes: { fields: JSON.parse(`{"__proto__":${JSON.stringify(value(1))}}`) } },
        "3218 0a16 0a095f5f70726f746f5f5f 1209 11000000000000f03f"
      ],
      ["a property", Guarded, JSON.parse(`{"__proto__":{"polluted":"yes"}}`), "0a0f 0a08706f6c6c75746564 1203796573"],
      ["an absent property", Guarded, {}, ""]
    ]
    for (const [name, schema, value, hex] of cases) {
      it(name, () => {
        assert.strictEqual(encode(schema, value), hex.replaceAll(" ", ""))
        assert.deepStrictEqual(decode(schema, hex), value)
        assert.isUndefined(({} as Record<string, unknown>).polluted)
      })
    }
  })

  // The tag names the case, even when the encoded values of cases overlap.
  describe("keeps the oneof case of a value", () => {
    class A extends Schema.Class<A>("A")(message({ id: Protobuf.Int32.pipe(f(1)) })) {}
    class B extends Schema.Class<B>("B")(message({ id: Protobuf.Int32.pipe(f(1)) })) {}
    const Classes = message({ v: Protobuf.Oneof({ a: A.pipe(f(1)), b: B.pipe(f(2)) }) })
    const Transformed = message({
      v: Schema.optionalKey(
        Protobuf.Oneof({ number: Schema.FiniteFromString.pipe(f(1)), text: Schema.String.pipe(f(2)) })
      )
    })
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, string]> = [
      ["a message case", Classes, { v: { _tag: "b", value: new B({ id: 1 }) } }, "12020801"],
      ["a scalar case", Transformed, { v: { _tag: "text", value: "5" } }, "120135"]
    ]
    for (const [name, schema, value, hex] of cases) {
      it(name, () => {
        assert.strictEqual(encode(schema, value), hex)
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }
  })

  describe("presence", () => {
    const Profile = message({
      name: Schema.String.pipe(f(1)),
      nickname: Schema.optionalKey(Schema.String).pipe(f(2))
    })

    it("writes explicit-presence zero values but not implicit ones", () => {
      const profile = { name: "", nickname: "" }
      assert.strictEqual(encode(Profile, profile), "1200")
      assert.deepStrictEqual(decode(Profile, "1200"), profile)
    })

    it("decodes empty collections of explicit-presence properties as absent", () => {
      const Lists = message({ omitted: Schema.optionalKey(Schema.Array(Schema.String)).pipe(f(1)) })
      assert.strictEqual(encode(Lists, { omitted: [] }), "")
      assert.deepStrictEqual(decode(Lists, ""), {})
    })
  })

  it("names a class of a message, and keeps its unknown fields", () => {
    class Event
      extends Schema.Class<Event>("Event")(Protobuf.Message("acme.v1.Event", { id: Protobuf.Int32.pipe(f(1)) }))
    {}
    const event = decode(Event, "0807 1801")
    assert.instanceOf(event, Event)
    assert.deepStrictEqual(event[Protobuf.unknown], bytes("1801"))
    assert.strictEqual(encode(Event, event), "08071801")
    assert.strictEqual(Protobuf.anyPack(Event, event).typeUrl, "type.googleapis.com/acme.v1.Event")
  })

  it("runs transformations and classes", () => {
    class Event extends Schema.Class<Event>("Event")(message({
      at: Protobuf.Double.pipe(Schema.decodeTo(Schema.DateTimeUtcFromMillis), f(1)),
      count: Schema.FiniteFromString.pipe(f(4)),
      amount: Schema.optionalKey(Schema.BigDecimalFromString).pipe(f(5))
    })) {}
    const event = new Event({ at: DateTime.makeUnsafe(1000), count: 5 })
    // field 1: double 1000, field 4: string "5"
    assert.strictEqual(encode(Event, event), "090000000000408f40220135")
    assert.deepStrictEqual(decode(Event, "090000000000408f40220135"), event)
    assert.strictEqual(
      encode(Event, new Event({ ...event, amount: BigDecimal.fromStringUnsafe("1.5") })),
      "090000000000408f402201352a03312e35"
    )
  })

  describe("fails to decode", () => {
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, string, RegExp]> = [
      ["a truncated varint", Point, "08", /premature end of input\n  at \["x"\]/],
      ["a truncated length", Wide, "0a0278", /premature end of input\n  at \["text"\]/],
      ["invalid UTF-8", Wide, "0a01ff", /invalid UTF-8 in string field\n  at \["text"\]/],
      ["a mismatched wire type", Point, "0d00000000", /wire type 5 does not match the field \(expected 0\)/],
      ["field number 0", Point, "0001", /illegal tag: field 0, wire type 0/],
      // Longer lengths and tags are rejected rather than truncated, so that the
      // bytes cannot be framed in two ways.
      ["a length beyond 32 bits", Wide, "0a8180808010 61", /invalid varint\n  at \["text"\]/],
      ["a tag beyond 32 bits", Point, "90808080808080808000 05", /^invalid varint$/],
      ["a stray end group tag", Point, "3c", /unexpected end group tag for field 7/],
      ["a field overrunning its message", Wide, "12010801", /field overruns its message\n  at \["point"\]/],
      ["an unsafe 64-bit number", Numbers, "1080808080808080 10", /uint64 value 9007199254740992 is outside the safe/],
      ["an absent message field", Labeled, "0a0161", /Missing key\n  at \["point"\]/],
      ["an absent required scalar", Legacy, "", /Missing key\n  at \["id"\]/],
      ["an absent nested message field", message({ l: Labeled.pipe(f(1)) }), "0a00", /at \["l"\]\["point"\]/],
      ["a map value overrunning its entry", Keys, "1a04 0807 1203", /premature end of input\n  at \["points"\]\["7"\]/],
      ["a Timestamp field of another wire type", Protobuf.Timestamp, "0d00000000", /wire type 5/],
      ["a Value field of another wire type", Protobuf.Value, "1001", /wire type 0 .* \(expected 1\)/],
      ["a ListValue field of another wire type", Protobuf.ListValue, "0800", /wire type 0 .* \(expected 2\)/],
      ["a Timestamp after year 9999", Protobuf.Timestamp, "088083d1ffaf07", /^timestamp out of range$/],
      ["a Duration beyond 315,576,000,000 seconds", Protobuf.Duration, "0881bcaece9709", /^duration out of range$/],
      [
        "a Duration with nanos of the other sign",
        Protobuf.Duration,
        "0801 10ffffffffffffffffff01",
        /^duration out of range$/
      ]
    ]
    for (const [name, schema, hex, message] of cases) {
      it(name, () => {
        assert.throws(() => decode(schema, hex), message)
      })
    }
  })

  // The wire layer checks values on its own, so these fail with schema checks
  // disabled too.
  describe("fails to encode values without a wire representation", () => {
    const field = <S extends Schema.Codec<any, any>>(schema: S) => message({ n: schema.pipe(f(1)) })
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, RegExp]> = [
      ["a fractional int32", field(Protobuf.Int32), { n: 1.5 }, /expected a protobuf int32\n  at \["n"\]/],
      ["a large uint64", field(Protobuf.UInt64), { n: 1n << 64n }, /expected a protobuf uint64\n  at \["n"\]/],
      ["a bigint zero int64 number", field(Protobuf.Int64Number), { n: 0n }, /expected a protobuf int64\n  at \["n"\]/],
      ["an infinite duration", field(Protobuf.Duration), { n: Duration.infinity }, /expected a finite duration/],
      [
        "a duration beyond 315,576,000,000 seconds",
        Protobuf.Duration,
        Duration.nanos(315_576_000_001n * 1_000_000_000n),
        /duration out of range/
      ],
      [
        "a Timestamp after year 9999",
        Protobuf.Timestamp,
        DateTime.makeUnsafe("+010000-01-01T00:00:00Z"),
        /timestamp out of range/
      ],
      [
        "malformed unknown fields",
        Keeper,
        { x: 1, [Protobuf.unknown]: bytes("ff") },
        /premature end of input\n  at \["\$unknown"\]/
      ],
      [
        "unknown fields with a declared number",
        Keeper,
        { x: 1, [Protobuf.unknown]: bytes("0802") },
        /unknown fields hold declared field 1/
      ]
    ]
    for (const [name, schema, value, message] of cases) {
      it(name, () => {
        assert.throws(() => Schema.encodeUnknownSync(Protobuf.toCodec(schema))(value, { disableChecks: true }), message)
      })
    }
  })

  it("fails to encode nesting that decoding rejects", () => {
    let list = value(1)
    // Each array is two levels: a Value and its ListValue.
    for (let i = 0; i < 256; i++) list = { kind: { _tag: "listValue", value: { values: [list] } } }
    assert.deepStrictEqual(decode(Protobuf.Value, encode(Protobuf.Value, list)), list)
    const deeper: Protobuf.Value = { kind: { _tag: "listValue", value: { values: [list] } } }
    assert.throws(() => encode(Protobuf.Value, deeper), /nesting deeper than 512/)
  })

  // A schema without checks or transformations skips the schema pass; the wire
  // layer accepts and produces exactly what the schema pass would.
  describe("the fast path", () => {
    const Profile = Protobuf.Message("test.v1.Profile", {
      name: Schema.String.pipe(f(1)),
      nickname: Schema.optionalKey(Schema.String).pipe(f(2)),
      state: State.pipe(f(3)),
      point: Point.pipe(f(4)),
      choice: Protobuf.Oneof({ text: Schema.String.pipe(f(5)), point: Point.pipe(f(6)) }),
      at: Schema.optionalKey(Protobuf.Timestamp).pipe(f(8)),
      json: Schema.optionalKey(Protobuf.Value).pipe(f(9)),
      ids: Protobuf.Map(Protobuf.Int32, Schema.String).pipe(f(10)),
      big: Protobuf.Map(Protobuf.Int64String, Schema.String).pipe(f(11)),
      flags: Protobuf.Map(Protobuf.BoolKey, Schema.String).pipe(f(12))
    })
    const valid = { name: "a", state: "active", point: { x: 1, y: 2 }, ids: {}, big: {}, flags: {} }
    const codecs = [Protobuf.toCodec(Profile), Protobuf.toCodec(inert(Profile))] as const

    const encodings: ReadonlyArray<readonly [string, unknown]> = [
      ["a valid value with every field", {
        ...valid,
        nickname: "",
        choice: { _tag: "point", value: { x: 0, y: 0 } },
        at: DateTime.makeUnsafe(0),
        json: value({ a: [1, null] }),
        [Protobuf.unknown]: bytes("5001")
      }],
      ["a value with an excess key", { ...valid, extra: 1 }],
      ["a missing key", { name: "a", state: "active", ids: {}, big: {}, flags: {} }],
      ["map keys that the key schemas reject", {
        ...valid,
        ids: { abc: "a", "1.5": "b", "2147483648": "c", "7": "d" },
        big: { "007": "a", "-0": "b", x: "c", "-5": "d" },
        flags: { yes: "a", TRUE: "b", true: "c" }
      }],
      ["map keys in other spellings of a number", { ...valid, ids: { "1e2": "a", "+7": "b", "-0": "c", "7.0": "d" } }],
      ["undefined in an optional key", { ...valid, nickname: undefined }],
      ["a wrong type", { ...valid, name: 1 }],
      ["an unknown enum value", { ...valid, state: "gone" }],
      ["an unknown oneof tag", { ...valid, choice: { _tag: "gone", value: 1 } }],
      ["a zoned DateTime", { ...valid, at: DateTime.makeZonedUnsafe(0, { timeZone: "Europe/Paris" }) }],
      ["not an object", "profile"]
    ]
    for (const [name, value] of encodings) {
      it(`encodes ${name} like the schema pass`, () => {
        const [fast, full] = codecs.map((codec) => attempt(() => Hex.encode(Schema.encodeUnknownSync(codec)(value))))
        assert.strictEqual("error" in fast, "error" in full, JSON.stringify([fast, full]))
        if ("value" in fast) assert.deepStrictEqual(fast, full)
      })
    }

    it("reports excess keys under onExcessProperty: error", () => {
      const options = { onExcessProperty: "error" } as const
      assert.throws(() => Schema.encodeUnknownSync(codecs[0])({ ...valid, extra: 1 }, options), /excess property/)
    })

    const decodings: ReadonlyArray<readonly [string, string]> = [
      ["a message with every field", "0a0161 1200 1801 22020801 3200 42020800 4a020800 5001"],
      ["an absent message field", "0a0161"],
      ["malformed bytes", "0a"]
    ]
    for (const [name, hex] of decodings) {
      it(`decodes ${name} like the schema pass`, () => {
        const [fast, full] = codecs.map((codec) => attempt(() => Schema.decodeUnknownSync(codec)(bytes(hex))))
        assert.deepStrictEqual(fast, full)
        if ("value" in fast) assert.deepStrictEqual(Object.keys(fast.value as object), Object.keys((full as any).value))
      })
    }

    it("keeps Schema.is a sound guard", () => {
      assert.isTrue(Schema.is(codecs[0])(valid))
      assert.isFalse(Schema.is(codecs[0])({ ...valid, name: 1 }))
    })
  })

  // Checks never choose a wire type: they run on the decoded value, and on the
  // value to encode.
  describe("runs schema checks", () => {
    const Name = message({ name: Schema.NonEmptyString.pipe(f(1)) })
    const Range = message({
      min: Protobuf.Int32.pipe(f(1)),
      max: Protobuf.Int32.pipe(f(2))
    }).check(Schema.makeFilter((range) => range.min <= range.max || "min > max"))
    const Positive = message({
      values: Schema.Array(Protobuf.Int32.check(Schema.isGreaterThan(0))).pipe(f(1))
    })
    const Distinct = message({
      choice: Protobuf.Oneof({
        long: Schema.String.check(Schema.isMinLength(5)).pipe(f(1)),
        number: Protobuf.Int32.pipe(f(2))
      })
    })
    const Merged = message({
      v: Protobuf.Oneof({
        text: Protobuf.StringValue.check(Schema.isMaxLength(1)).pipe(f(1)),
        number: Protobuf.Int32Value.pipe(f(2))
      })
    })

    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, string, RegExp]> = [
      // An absent field decodes to its default value, which is checked too.
      ["an absent field", Name, "", /length of at least 1\n  at \["name"\]/],
      ["a repeated element", Positive, "0a020100", /greater than 0\n  at \["values"\]\[1\]/],
      ["a message", Range, "08051001", /min > max/],
      ["a oneof case", Distinct, "0a026162", /length of at least 5\n  at \["choice"\]\["value"\]/],
      // A later occurrence of a wrapper case merges into the earlier one.
      ["a oneof case merged from several occurrences", Merged, "0a040a026162 0a00", /length of at most 1/]
    ]
    for (const [name, schema, hex, message] of cases) {
      it(`on ${name} after decoding`, () => {
        assert.throws(() => decode(schema, hex), message)
      })
    }

    it("before encoding", () => {
      assert.throws(() => encode(Name, { name: "" }), /length of at least 1\n  at \["name"\]/)
      assert.throws(() => encode(Range, { min: 5, max: 1 }), /min > max/)
    })

    it("without choosing wire types", () => {
      const Int = message({ n: Protobuf.Double.check(Schema.isInt()).pipe(f(1)) })
      assert.strictEqual(encode(Int, { n: 3 }), "090000000000000840")
    })
  })

  describe("rejects layouts when the codec is created", () => {
    class Opaque {
      readonly value = 1
    }
    const cases: ReadonlyArray<readonly [string, Schema.Top, RegExp]> = [
      [
        "a property without a field number",
        message({ a: Schema.String }),
        /property "a" of test.v1.Message has no field/
      ],
      [
        "a duplicate field number",
        message({ a: Schema.String.pipe(f(1)), b: Schema.String.pipe(f(1)) }),
        /duplicate field number 1 in test.v1.Message \("b"\)/
      ],
      [
        "a numbered oneof property",
        message({ a: Protobuf.Oneof({ x: Schema.String.pipe(f(1)) }).pipe(f(3)) }),
        /is a oneof; number its cases/
      ],
      [
        "a oneof case without a number",
        message({ a: Protobuf.Oneof({ x: Schema.String.pipe(f(1)), y: Schema.String }) }),
        /member 1 of property "a" of test.v1.Message is not a case of Protobuf.Oneof/
      ],
      [
        "a union without Protobuf.Oneof",
        message({ a: Schema.Union([Schema.String, Protobuf.Int32]).pipe(f(1)) }),
        /is a union; use Protobuf.Oneof/
      ],
      [
        "a nullable property",
        message({ a: Schema.NullOr(Schema.String).pipe(f(1)) }),
        /is nullable; use Schema.optionalKey/
      ],
      [
        "an array of arrays",
        message({ a: Schema.Array(Schema.Array(Schema.String)).pipe(f(1)) }),
        /\(element\) is a repeated value, which is a field of its own/
      ],
      [
        "a oneof in an array",
        message({ a: Schema.Array(Protobuf.Oneof({ x: Schema.String.pipe(f(1)) })).pipe(f(1)) }),
        /is a oneof, which is a property of its own/
      ],
      ["a tuple", message({ a: Schema.Tuple([Schema.String]).pipe(f(1)) }), /is a tuple/],
      [
        "a struct with index signatures",
        Schema.StructWithRest(Schema.Struct({ a: Schema.String.pipe(f(1)) }), [
          Schema.Record(Schema.String, Schema.Number)
        ]),
        /is a struct with index signatures/
      ],
      ["a root that is not a message", Schema.String, /the root schema is not a message; use Protobuf.Message/],
      [
        "a struct without Protobuf.Message",
        message({ a: Schema.Struct({ b: Schema.String.pipe(f(1)) }).pipe(f(1)) }),
        /property "a" of test.v1.Message is a struct; use Protobuf.Message/
      ],
      [
        "a record without Protobuf.Map",
        message({ a: Schema.Record(Schema.String, Schema.String).pipe(f(1)) }),
        /is a record; use Protobuf.Map/
      ],
      [
        "64-bit map keys as numbers",
        message({ a: Protobuf.Map(Protobuf.Int64Number, Schema.String).pipe(f(1)) }),
        /unsupported map key; use Schema.String, Protobuf.Int32, …, Protobuf.Int64String, …, or Protobuf.BoolKey/
      ],
      [
        "a number without a protobuf type",
        message({ a: Schema.Number.pipe(f(1)) }),
        /is a number; use Protobuf.Double/
      ],
      ["a bigint without a protobuf type", message({ a: Schema.BigInt.pipe(f(1)) }), /is a bigint; use Protobuf.Int64/],
      ["a literal", message({ a: Schema.Literal("x").pipe(f(1)) }), /is a literal; use Protobuf.Enum/],
      [
        "a packed singular field",
        message({ a: Protobuf.Int32.pipe(f(1, { packed: true })) }),
        /only repeated fields can be packed/
      ],
      [
        "a required repeated field",
        message({ a: Schema.Array(Protobuf.Int32).pipe(f(1, { required: true })) }),
        /only singular fields can be required/
      ],
      [
        "a packed string array",
        message({ a: Schema.Array(Schema.String).pipe(f(1, { packed: true })) }),
        /cannot be packed/
      ],
      [
        "a default of a repeated field",
        message({ a: Schema.Array(Protobuf.Int32).pipe(f(1, { default: 1 })) }),
        /only scalars and enums have a default/
      ],
      [
        "a default of a message field",
        message({ a: Schema.optionalKey(Point).pipe(f(1, { default: {} })) }),
        /is not a scalar or enum; only those have a default/
      ],
      [
        "a delimited scalar",
        message({ a: Schema.String.pipe(f(1, { delimited: true })) }),
        /only messages can use the delimited encoding/
      ],
      [
        "a delimited map",
        message({ a: Protobuf.Map(Schema.String, Point).pipe(f(1, { delimited: true })) }),
        /only messages can use the delimited encoding/
      ],
      [
        "UTF-8 validation of a field without strings",
        message({ a: Protobuf.Int32.pipe(f(1, { validateUtf8: false })) }),
        /holds no strings; only strings take validateUtf8/
      ],
      [
        "a declaration without a protobuf mapping",
        message({ a: Schema.instanceOf(Opaque).pipe(f(1)) }),
        /is a declaration without a protobuf mapping/
      ],
      ["Unknown", message({ a: Schema.Unknown.pipe(f(1)) }), /no protobuf mapping for Unknown/],
      [
        "a required optional field",
        message({ a: Schema.optionalKey(Schema.String).pipe(f(1, { required: true })) }),
        /only those can be required/
      ],
      [
        "an optional oneof case",
        message({ a: Protobuf.Oneof({ x: Schema.optionalKey(Schema.String).pipe(f(1)) }) }),
        /case x of property "a" of test.v1.Message is optional/
      ],
      [
        "an implicit-presence closed enum without 0",
        message({ a: Protobuf.Enum("test.v1.Level", { low: 1, high: 2 }).pipe(f(1)) }),
        /is a closed enum without a value for 0/
      ]
    ]
    for (const [name, schema, message] of cases) {
      it(name, () => {
        assert.throws(() => Protobuf.toCodec(schema), message)
      })
    }
  })

  it("rejects invalid field and enum numbers", () => {
    for (const number of [0, 1.5, 19000, 536870912]) {
      assert.throws(() => Protobuf.field(number), /Protobuf field number must be an integer/)
    }
    assert.throws(() => Protobuf.Enum("test.v1.E", { a: 2 ** 31 }), /value a of test.v1.E must be a 32-bit integer/)
    assert.throws(() => Protobuf.Enum("test.v1.E", {}), /test.v1.E needs at least one value/)
  })
})
