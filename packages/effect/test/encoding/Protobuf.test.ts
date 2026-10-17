/** @effect-diagnostics schemaNumber:off */
import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, DateTime, Duration, Option, Result, Schema } from "effect"
import * as Hex from "effect/encoding/Hex"
import * as Protobuf from "effect/encoding/Protobuf"

const bytes = (hex: string): Uint8Array<ArrayBuffer> =>
  Result.getOrThrow(Hex.decode(hex.replaceAll(" ", ""))) as Uint8Array<ArrayBuffer>

const encode = <A, I>(schema: Schema.Codec<A, I>, value: A): string =>
  Hex.encode(Schema.encodeUnknownSync(Protobuf.toCodec(schema))(value))

const decode = <A, I>(schema: Schema.Codec<A, I>, hex: string): A =>
  Schema.decodeUnknownSync(Protobuf.toCodec(schema))(bytes(hex))

// The schemas mirror these protos. `kitchen_sink.proto` is the fixture of the
// `prototype/effect-protobuf` branch.
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
// message Status {
//   enum State { STATE_UNSPECIFIED = 0; STATE_ACTIVE = 1; STATE_SUSPENDED = 2; }
//   State state = 1; repeated State history = 2; }
// message Pick { oneof choice { string text = 1; int32 number = 2; acme.v1.Point point = 3; } }
// message Wide { string text = 1; acme.v1.Point point = 2; int32 high = 536870911; }
// message Doubles { double value = 1; }
// message Numbers { int64 signed = 1 [jstype = JS_NUMBER]; uint64 unsigned = 2 [jstype = JS_NUMBER]; }
//
// // test/v1/structural.proto: the synthesized messages
// message Pair { optional string first = 1; optional int32 second = 2; }
// message Triple { optional string first = 1; optional bool second = 2; repeated int32 rest = 3; }
// message Tuples { Pair pair = 1; Triple triple = 2; }
// message ByPoint { map<int32, acme.v1.Point> entries = 1; }
// message DoubleKeys { message Entry { optional double key = 1; optional string value = 2; } repeated Entry entries = 1; }
// message Grid { message Row { repeated int32 value = 1; } repeated Row rows = 1; }
// message Sparse { message Item { optional string value = 1; } repeated Item items = 1; map<string, Item> labels = 2; }
// message Maybe { message Inner { optional string value = 1; } optional Inner value = 1; }
// message Mixed { message Item { oneof value { string label = 1; acme.v1.Point point = 2; } } repeated Item items = 1; }
// message Mode { oneof mode { google.protobuf.Empty auto = 1; int32 fixed = 2; string named = 3; } }
// message Versioned { string version = 1; int32 revision = 2; string color = 3; }
// message Bag { string name = 1; map<string, int32> extra = 2; } // keys "x-…"
// message Ints { repeated int32 value = 1; }
// message RootChoice { oneof value { string text = 1; int32 number = 2; } }
// message Symbols { string key = 1; }
//
// // test/v2/legacy.proto (proto2)
// message Legacy {
//   required int32 id = 1;
//   optional group Item = 2 { optional string name = 3; }
//   repeated group Entry = 4 { optional int32 n = 5; } }

const Point = Schema.Struct({
  x: Protobuf.Int32.pipe(Protobuf.field(1)),
  y: Protobuf.Int32.pipe(Protobuf.field(2))
}).annotate({ identifier: "acme.v1.Point" })

const Scalars = Schema.Struct({
  fDouble: Schema.Number.pipe(Protobuf.field(1)),
  fFloat: Protobuf.Float.pipe(Protobuf.field(2)),
  fInt32: Protobuf.Int32.pipe(Protobuf.field(3)),
  fInt64: Protobuf.Int64.pipe(Protobuf.field(4)),
  fUint32: Protobuf.UInt32.pipe(Protobuf.field(5)),
  fUint64: Protobuf.UInt64.pipe(Protobuf.field(6)),
  fSint32: Protobuf.SInt32.pipe(Protobuf.field(7)),
  fSint64: Protobuf.SInt64.pipe(Protobuf.field(8)),
  fFixed32: Protobuf.Fixed32.pipe(Protobuf.field(9)),
  fFixed64: Protobuf.Fixed64.pipe(Protobuf.field(10)),
  fSfixed32: Protobuf.SFixed32.pipe(Protobuf.field(11)),
  fSfixed64: Protobuf.SFixed64.pipe(Protobuf.field(12)),
  fBool: Schema.Boolean.pipe(Protobuf.field(13)),
  fString: Schema.String.pipe(Protobuf.field(14)),
  fBytes: Schema.Uint8Array.pipe(Protobuf.field(15))
})

const Color = Schema.Enum({ COLOR_UNSPECIFIED: 0, COLOR_RED: 1, COLOR_GREEN: 2, COLOR_BLUE: 3 })

const Circle = Schema.Struct({
  center: Schema.optionalKey(Point).pipe(Protobuf.field(1)),
  radius: Schema.Number.pipe(Protobuf.field(2))
})

const Shapes = Schema.Struct({
  numbers: Schema.Array(Protobuf.Int32).pipe(Protobuf.field(1)),
  names: Schema.Array(Schema.String).pipe(Protobuf.field(2)),
  points: Schema.Array(Point).pipe(Protobuf.field(3)),
  colors: Schema.Array(Color).pipe(Protobuf.field(4)),
  counts: Schema.Record(Schema.String, Protobuf.Int32).pipe(Protobuf.field(5)),
  labels: Schema.Record(Protobuf.Int32, Schema.String).pipe(Protobuf.field(6)),
  namedPoints: Schema.Record(Schema.String, Point).pipe(Protobuf.field(7)),
  nickname: Schema.optionalKey(Schema.String).pipe(Protobuf.field(8)),
  maybeNumber: Schema.optionalKey(Protobuf.Int32).pipe(Protobuf.field(9)),
  origin: Schema.optionalKey(Point).pipe(Protobuf.field(10)),
  primary: Color.pipe(Protobuf.field(11)),
  shape: Schema.optionalKey(Schema.Union([
    Schema.TaggedStruct("circle", { value: Circle.pipe(Protobuf.field(12)) }),
    Schema.TaggedStruct("squareCorner", { value: Point.pipe(Protobuf.field(13)) }),
    Schema.TaggedStruct("label", { value: Schema.String.pipe(Protobuf.field(14)) }),
    Schema.TaggedStruct("code", { value: Protobuf.Int64.pipe(Protobuf.field(15)) })
  ]))
})

const WellKnown = Schema.Struct({
  createdAt: Schema.optionalKey(Protobuf.Timestamp).pipe(Protobuf.field(1)),
  ttl: Schema.optionalKey(Protobuf.Duration).pipe(Protobuf.field(2)),
  maybeText: Schema.optionalKey(Protobuf.StringValue).pipe(Protobuf.field(3)),
  maybeInt: Schema.optionalKey(Protobuf.Int32Value).pipe(Protobuf.field(4)),
  maybeBool: Schema.optionalKey(Protobuf.BoolValue).pipe(Protobuf.field(5)),
  attributes: Schema.optionalKey(Protobuf.Struct).pipe(Protobuf.field(6)),
  anything: Schema.optionalKey(Protobuf.Value).pipe(Protobuf.field(7)),
  nothing: Schema.optionalKey(Protobuf.Empty).pipe(Protobuf.field(8))
})

interface TreeNode {
  readonly name: string
  readonly children: ReadonlyArray<TreeNode>
}

const TreeNode: Schema.Codec<TreeNode> = Schema.Struct({
  name: Schema.String.pipe(Protobuf.field(1)),
  children: Schema.Array(Schema.suspend((): Schema.Codec<TreeNode> => TreeNode)).pipe(Protobuf.field(2))
})

const Unpacked = Schema.Struct({
  values: Schema.Array(Protobuf.Int32).pipe(Protobuf.field(1, { packed: false })),
  zigzag: Schema.Array(Protobuf.SInt64).pipe(Protobuf.field(2))
})

const Keys = Schema.Struct({
  byId: Schema.Record(Protobuf.mapKey("int64"), Schema.String).pipe(Protobuf.field(1)),
  flags: Schema.Record(Protobuf.mapKey("bool"), Protobuf.Int32).pipe(Protobuf.field(2)),
  points: Schema.Record(Protobuf.UInt32, Point).pipe(Protobuf.field(3))
})

const State = Schema.Literals(["unspecified", "active", "suspended"]).pipe(
  Protobuf.enumNumbers({ unspecified: 0, active: 1, suspended: 2 })
)

const Status = Schema.Struct({
  state: State.pipe(Protobuf.field(1)),
  history: Schema.Array(State).pipe(Protobuf.field(2))
})

const Pick = Schema.Struct({
  choice: Schema.optionalKey(Schema.Union([
    Schema.String.pipe(Protobuf.field(1)),
    Protobuf.Int32.pipe(Protobuf.field(2)),
    Point.pipe(Protobuf.field(3))
  ]))
})

const Wide = Schema.Struct({
  text: Schema.String.pipe(Protobuf.field(1)),
  point: Schema.optionalKey(Point).pipe(Protobuf.field(2)),
  high: Protobuf.Int32.pipe(Protobuf.field(536870911))
})

const Doubles = Schema.Struct({ value: Schema.Number.pipe(Protobuf.field(1)) })

const Numbers = Schema.Struct({
  signed: Protobuf.Int64Number.pipe(Protobuf.field(1)),
  unsigned: Protobuf.UInt64Number.pipe(Protobuf.field(2))
})

const Tuples = Schema.Struct({
  pair: Schema.Tuple([Schema.String, Protobuf.Int32]).pipe(Protobuf.field(1)),
  triple: Schema.TupleWithRest(Schema.Tuple([Schema.String, Schema.optionalKey(Schema.Boolean)]), [Protobuf.Int32])
    .pipe(Protobuf.field(2))
})

const Legacy = Schema.Struct({
  id: Protobuf.Int32.pipe(Protobuf.field(1, { presence: "always" })),
  item: Schema.optionalKey(Schema.Struct({ name: Schema.optionalKey(Schema.String).pipe(Protobuf.field(3)) }))
    .pipe(Protobuf.field(2, { encoding: "delimited" })),
  entry: Schema.Array(Schema.Struct({ n: Schema.optionalKey(Protobuf.Int32).pipe(Protobuf.field(5)) }))
    .pipe(Protobuf.field(4, { encoding: "delimited" }))
})

const Keeper = Schema.Struct({ x: Protobuf.Int32.pipe(Protobuf.field(1)), unknownFields: Protobuf.UnknownFields })

const RootChoice = Schema.Union([Schema.String.pipe(Protobuf.field(1)), Protobuf.Int32.pipe(Protobuf.field(2))])

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
  primary: 0
} as const

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
          colors: [1, 0, 3],
          counts: { a: 1, b: 0 },
          labels: { 1: "one", [-5]: "minus five" },
          namedPoints: { o: { x: 0, y: 0 } },
          nickname: "",
          maybeNumber: 0,
          origin: { x: 0, y: 0 },
          primary: 2,
          shape: { _tag: "circle", value: { center: { x: 1, y: 1 }, radius: 2.5 } }
        },
        "0a0d01feffffffffffffffff01ac02 12016112 00 1a0408011002 1a00 22030100 03 2a050a0161 1001 2a050a01621000 3207080112036f6e65 321708fbffffffffffffffff01120a6d696e757320666976 65 3a050a016f1200 4200 4800 5200 5802 620f0a0408011001110000000000000440"
      ],
      [
        "a oneof scalar case",
        Shapes,
        { ...emptyShapes, shape: { _tag: "code", value: -7n } },
        "78f9ffffffffffffffff01"
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
          attributes: { a: 1, b: [true, null, "x"], c: { d: {} } },
          anything: "str",
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
      ["enum numbers of string literals", Status, {
        state: "suspended",
        history: ["active", "unspecified", "suspended"]
      }, "0802 1203010002"],
      ["a self-numbered oneof string case", Pick, { choice: "hi" }, "0a026869"],
      ["a oneof case holding its zero value", Pick, { choice: 0 }, "1000"],
      ["a oneof case holding an empty message", Pick, { choice: { x: 0, y: 0 } }, "1a00"],
      ["long length prefixes and the highest field number", Wide, {
        text: "x".repeat(200),
        point: { x: 1, y: 0 },
        high: 7
      }, `0ac801${"78".repeat(200)} 12020801 f8ffffff0f07`],
      ["negative zero", Doubles, { value: -0 }, "090000000000000080"],
      ["64-bit integers as numbers", Numbers, {
        signed: -1,
        unsigned: Number.MAX_SAFE_INTEGER
      }, "08ffffffffffffffffff01 10ffffffffffffff0f"],
      ["a Timestamp root", Protobuf.Timestamp, DateTime.makeUnsafe(-1500), "08feffffffffffffffff01 1080cab5ee01"],
      ["a Duration root", Protobuf.Duration, Duration.nanos(1_000_000_500n), "0801 10f403"],
      ["an empty StringValue root", Protobuf.StringValue, "", ""],
      ["a StringValue root", Protobuf.StringValue, "a", "0a0161"],
      [
        "a Value root",
        Protobuf.Value,
        { a: [1, "x", null, true] },
        "2a210a1f0a0161121a32180a0911000000000000f03f0a031a01780a0208000a022001"
      ],
      ["a Void root", Schema.Void, undefined, ""]
    ]
    for (const [name, schema, value, hex] of cases) {
      it(name, () => {
        assert.strictEqual(encode(schema, value), hex.replaceAll(" ", ""))
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }
  })

  // Same provenance, for the messages synthesized around values that protobuf
  // cannot hold directly.
  describe("writes and reads synthesized messages like @bufbuild/protobuf", () => {
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, string]> = [
      ["tuples, with every element written", Tuples, {
        pair: ["a", 0],
        triple: ["x", true, 1, 2]
      }, "0a050a01611000 12090a017810011a020102"],
      [
        "tuples without optional and rest elements",
        Tuples,
        { pair: ["", 5], triple: ["x"] },
        "0a040a001005 12030a0178"
      ],
      [
        "a ReadonlyMap, as a map",
        Schema.Struct({ entries: Schema.ReadonlyMap(Protobuf.Int32, Point).pipe(Protobuf.field(1)) }),
        { entries: new Map([[1, { x: 1, y: 0 }], [2, { x: 0, y: 0 }]]) },
        "0a06080112020801 0a0408021200"
      ],
      [
        "double map keys, as repeated entries",
        Schema.Struct({ entries: Schema.Record(Protobuf.Double, Schema.String).pipe(Protobuf.field(1)) }),
        { entries: { 0: "", 1.5: "a" } },
        "0a0b0900000000000000001200 0a0c09000000000000f83f120161"
      ],
      [
        "nested arrays, boxed",
        Schema.Struct({ rows: Schema.Array(Schema.Array(Protobuf.Int32)).pipe(Protobuf.field(1)) }),
        { rows: [[1, 2], [], [3]] },
        "0a040a020102 0a00 0a030a0103"
      ],
      [
        "nullable elements and map values, boxed",
        Schema.Struct({
          items: Schema.Array(Schema.NullOr(Schema.String)).pipe(Protobuf.field(1)),
          labels: Schema.Record(Schema.String, Schema.NullOr(Schema.String)).pipe(Protobuf.field(2))
        }),
        { items: ["a", null, ""], labels: { x: null, y: "b" } },
        "0a030a0161 0a00 0a020a00 12050a01781200 12080a017912030a0162"
      ],
      ...([
        [Option.some(Option.some("a")), "0a030a0161"],
        [Option.some(Option.none()), "0a00"],
        [Option.none(), ""]
      ] as const).map(([value, hex]) =>
        [
          `a nested Option: ${String(value)}`,
          Schema.Struct({ value: Schema.Option(Schema.Option(Schema.String)).pipe(Protobuf.field(1)) }),
          { value },
          hex
        ] as const
      ),
      [
        "unions as array elements, boxed as oneofs",
        Schema.Struct({
          items: Schema.Array(Schema.Union([Schema.String.pipe(Protobuf.field(1)), Point.pipe(Protobuf.field(2))]))
            .pipe(Protobuf.field(1))
        }),
        { items: ["a", { x: 1, y: 0 }] },
        "0a030a0161 0a0412020801"
      ],
      ...([["auto", "0a00"], [7, "1007"], ["low", "1a036c6f77"]] as const).map(([mode, hex]) =>
        [
          `a oneof with literal cases: ${mode}`,
          Schema.Struct({
            mode: Schema.Union([
              Schema.Literal("auto").pipe(Protobuf.field(1)),
              Protobuf.Int32.pipe(Protobuf.field(2)),
              Schema.Literals(["low", "high"]).pipe(Protobuf.field(3))
            ])
          }),
          { mode },
          hex
        ] as const
      ),
      [
        "numbered literals and string literal unions",
        Schema.Struct({
          version: Schema.Literal("v2").pipe(Protobuf.field(1)),
          revision: Schema.Literal(3).pipe(Protobuf.field(2)),
          color: Schema.Literals(["red", "green"]).pipe(Protobuf.field(3))
        }),
        { version: "v2", revision: 3, color: "green" },
        "0a027632 1003 1a05677265656e"
      ],
      [
        "a struct with rest, as a map",
        Schema.StructWithRest(Schema.Struct({ name: Schema.String.pipe(Protobuf.field(1)) }), [
          Schema.Record(Schema.TemplateLiteral(["x-", Schema.String]), Protobuf.Int32.pipe(Protobuf.field(2)))
        ]),
        { name: "n", "x-a": 1, "x-b": 0 },
        "0a016e 12070a03782d611001 12070a03782d621000"
      ],
      ["an array root, boxed", Schema.Array(Protobuf.Int32), [1, 2], "0a020102"],
      ["a scalar root, boxed like StringValue", Schema.String, "a", "0a0161"],
      ["a union root, boxed as a oneof", RootChoice, "hi", "0a026869"],
      ["a union root holding its second case", RootChoice, 5, "1005"],
      [
        "registered symbols",
        Schema.Struct({ key: Schema.Symbol.pipe(Protobuf.field(1)) }),
        { key: Symbol.for("k") },
        "0a016b"
      ],
      [
        "proto2 required fields and groups",
        Legacy,
        { id: 0, item: { name: "x" }, entry: [{ n: 1 }, { n: 2 }] },
        "0800 13 1a0178 14 23 2801 24 23 2802 24"
      ],
      [
        "unknown fields, kept and written back",
        Schema.Struct({ fDouble: Schema.Number.pipe(Protobuf.field(1)), unknownFields: Protobuf.UnknownFields }),
        { fDouble: 1, unknownFields: bytes("18ffffffffffffffffff01 720173") },
        "09000000000000f03f 18ffffffffffffffffff01 720173"
      ]
    ]
    for (const [name, schema, value, hex] of cases) {
      it(name, () => {
        assert.strictEqual(encode(schema, value), hex.replaceAll(" ", ""))
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }
  })

  describe("decodes", () => {
    const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, string, unknown]> = [
      ["a packed field declared unpacked", Unpacked, "0a03010203", { values: [1, 2, 3], zigzag: [] }],
      ["an unpacked field declared packed", Unpacked, "1001 1002", { values: [], zigzag: [-1n, 1n] }],
      ["the last occurrence of a scalar", Point, "0801 0802", { x: 2, y: 0 }],
      ["the last occurrence of a oneof", Pick, "0a026869 1005", { choice: 5 }],
      ["merged occurrences of a message", Wide, "12020801 12021002", { text: "", point: { x: 1, y: 2 }, high: 0 }],
      [
        "past unknown fields of every wire type, groups included",
        Point,
        "1801 210000000000000000 2a0161 3500000000 3b08013c 0805",
        { x: 5, y: 0 }
      ],
      ["a Timestamp to millisecond precision", Protobuf.Timestamp, "0801 10e0c65b", DateTime.makeUnsafe(1001)],
      ["a delimited field sent length-prefixed", Legacy, "0800 12031a0178", { id: 0, item: { name: "x" }, entry: [] }],
      ["unknown fields of every wire type into UnknownFields", Keeper, "0805 1801 2a0161 3b08013c", {
        x: 5,
        unknownFields: bytes("1801 2a0161 3b08013c")
      }],
      ["no unknown fields as empty bytes", Keeper, "0805", { x: 5, unknownFields: new Uint8Array(0) }]
    ]
    for (const [name, schema, hex, value] of cases) {
      it(name, () => {
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }
  })

  describe("presence", () => {
    const Profile = Schema.Struct({
      kind: Schema.Literal("profile"),
      name: Schema.String.pipe(Protobuf.field(1)),
      nickname: Schema.optionalKey(Schema.String).pipe(Protobuf.field(2)),
      bio: Schema.optional(Schema.String).pipe(Protobuf.field(3)),
      parent: Schema.NullOr(Schema.String).pipe(Protobuf.field(4)),
      avatar: Schema.UndefinedOr(Schema.String).pipe(Protobuf.field(5)),
      note: Schema.Option(Schema.String).pipe(Protobuf.field(6))
    })

    it("fills absent fields and restores literals", () => {
      assert.deepStrictEqual(decode(Profile, ""), {
        kind: "profile",
        name: "",
        parent: null,
        avatar: undefined,
        note: Option.none()
      })
    })

    it("writes explicit-presence zero values but not implicit ones", () => {
      const profile = {
        kind: "profile",
        name: "",
        nickname: "",
        bio: "",
        parent: "",
        avatar: "",
        note: Option.some("")
      } as const
      assert.strictEqual(encode(Profile, profile), "12001a0022002a003200")
      assert.deepStrictEqual(decode(Profile, "12001a0022002a003200"), profile)
    })

    it("validates zero-filled fields and reports absent messages", () => {
      const Named = Schema.Struct({ name: Schema.NonEmptyString.pipe(Protobuf.field(1)) })
      assert.throws(() => decode(Named, ""), /Expected a value with a length of at least 1\n  at \["name"\]/)
      const Located = Schema.Struct({ at: Point.pipe(Protobuf.field(1)) })
      assert.throws(() => decode(Located, ""), /Missing key\n  at \["at"\]/)
    })
  })

  it("runs transformations, classes and JSON encodings of declarations", () => {
    class Event extends Schema.Class<Event>("acme.v1.Event")({
      kind: Schema.Literal("event"),
      at: Schema.DateTimeUtcFromMillis.pipe(Protobuf.field(1)),
      count: Schema.FiniteFromString.pipe(Protobuf.field(4)),
      amount: Schema.optionalKey(Schema.BigDecimal).pipe(Protobuf.field(5))
    }) {}
    const event = new Event({ kind: "event", at: DateTime.makeUnsafe(1000), count: 5 })
    // field 1: double 1000, field 4: string "5"
    assert.strictEqual(encode(Event, event), "0900000000 00408f40 220135".replaceAll(" ", ""))
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
      ["wire type 6", Point, "0e", /illegal tag: field 1, wire type 6/],
      ["a stray end group tag", Point, "3c", /unexpected end group tag for field 7/],
      ["a field overrunning its message", Wide, "12010801", /field overruns its message\n  at \["point"\]/],
      ["an unsafe 64-bit number", Numbers, "1080808080808080 10", /uint64 value 9007199254740992 is outside the safe/],
      ["an unknown enum number", Status, "0807", /Expected "unspecified" \| "active" \| "suspended"\n  at \["state"\]/]
    ]
    for (const [name, schema, hex, message] of cases) {
      it(name, () => {
        assert.throws(() => decode(schema, hex), message)
      })
    }
  })

  it("fails to encode values outside the wire range", () => {
    const Big = Schema.Struct({ n: Schema.BigInt.pipe(Protobuf.field(1)) })
    assert.throws(() => encode(Big, { n: 1n << 63n }), /expected a protobuf int64\n  at \["n"\]/)
    const Ttl = Schema.Struct({ ttl: Protobuf.Duration.pipe(Protobuf.field(1)) })
    assert.throws(() => encode(Ttl, { ttl: Duration.infinity }), /expected a finite duration\n  at \["ttl"\]/)
  })

  describe("rejects layouts when the codec is created", () => {
    class Opaque {
      readonly value = 1
    }
    const cases: ReadonlyArray<readonly [string, Schema.Top, RegExp]> = [
      [
        "a property without a field number",
        Schema.Struct({ a: Schema.String }),
        /property "a" of message has no field/
      ],
      [
        "a duplicate field number",
        Schema.Struct({ a: Schema.String.pipe(Protobuf.field(1)), b: Schema.String.pipe(Protobuf.field(1)) }),
        /duplicate field number 1 in message \("b"\)/
      ],
      [
        "a numbered oneof property",
        Schema.Struct({
          a: Schema.Union([Schema.String.pipe(Protobuf.field(1)), Protobuf.Int32.pipe(Protobuf.field(2))]).pipe(
            Protobuf.field(3)
          )
        }),
        /is a oneof; number its members/
      ],
      [
        "a oneof member without a number",
        Schema.Struct({ a: Schema.Union([Schema.String.pipe(Protobuf.field(1)), Point]) }),
        /member 1 of property "a" of message is not a oneof case/
      ],
      [
        "literals of different types",
        Schema.Struct({ a: Schema.Literals(["x", 1]).pipe(Protobuf.field(1)) }),
        /literals of different types; annotate it with Protobuf.enumNumbers/
      ],
      [
        "a numbered null",
        Schema.Struct({ a: Schema.Null.pipe(Protobuf.field(1)) }),
        /is Null, which has no wire representation/
      ],
      [
        "a packed string array",
        Schema.Struct({ a: Schema.Array(Schema.String).pipe(Protobuf.field(1, { packed: true })) }),
        /cannot be packed/
      ],
      [
        "a delimited scalar",
        Schema.Struct({ a: Schema.String.pipe(Protobuf.field(1, { encoding: "delimited" })) }),
        /only messages can use the delimited encoding/
      ],
      [
        "symbol map keys",
        Schema.Struct({ a: Schema.Record(Schema.Symbol, Schema.String).pipe(Protobuf.field(1)) }),
        /unsupported map key/
      ],
      [
        "an unnumbered index signature",
        Schema.StructWithRest(Schema.Struct({ a: Schema.String.pipe(Protobuf.field(1)) }), [
          Schema.Record(Schema.String, Schema.Number)
        ]),
        /index signature of message has no field number; annotate the record value/
      ],
      [
        "elements after a rest element",
        Schema.Struct({
          a: Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number, Schema.String]).pipe(
            Protobuf.field(1)
          )
        }),
        /has elements after its rest element/
      ],
      [
        "a declaration without a codec",
        Schema.Struct({ a: Schema.instanceOf(Opaque).pipe(Protobuf.field(1)) }),
        /declaration without a protobuf mapping or codec annotation/
      ],
      ["Never", Schema.Struct({ a: Schema.Never.pipe(Protobuf.field(1)) }), /no protobuf mapping for Never/]
    ]
    for (const [name, schema, message] of cases) {
      it(name, () => {
        assert.throws(() => Protobuf.toCodec(schema), message)
      })
    }
  })

  it("rejects invalid field numbers", () => {
    for (const number of [0, 1.5, 19000, 19999, 536870912]) {
      assert.throws(() => Protobuf.field(number), /Protobuf field number must be an integer/)
    }
  })
})
