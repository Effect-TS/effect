/** @effect-diagnostics schemaNumber:off */
import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, DateTime, Duration, Option, Result, Schema } from "effect"
import type { SchemaAST } from "effect"
import * as Hex from "effect/encoding/Hex"
import * as Protobuf from "effect/encoding/Protobuf"

const bytes = (hex: string): Uint8Array<ArrayBuffer> =>
  Result.getOrThrow(Hex.decode(hex.replaceAll(" ", ""))) as Uint8Array<ArrayBuffer>

const encode = <A, I>(schema: Schema.Codec<A, I>, value: A): string =>
  Hex.encode(Schema.encodeUnknownSync(Protobuf.toCodec(schema))(value))

const decode = <A, I>(schema: Schema.Codec<A, I>, hex: string): A =>
  Schema.decodeUnknownSync(Protobuf.toCodec(schema))(bytes(hex))

const encodeJson = <A, I>(schema: Schema.Codec<A, I>, value: A): Schema.Json =>
  Schema.encodeUnknownSync(Protobuf.toCodecJson(schema))(value)

const decodeJson = <A, I>(schema: Schema.Codec<A, I>, json: unknown, options?: SchemaAST.ParseOptions): A =>
  Schema.decodeUnknownSync(Protobuf.toCodecJson(schema))(json, options)

// The schemas mirror these protos. `kitchen_sink.proto` is the fixture of the
// `prototype/effect-protobuf` branch. Field and enum value names are the ones
// the JSON mapping derives from the schemas.
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
//   enum State { unspecified = 0; active = 1; suspended = 2; }
//   State state = 1; repeated State history = 2; }
// message Pick { oneof choice { string choice_1 = 1; int32 choice_2 = 2; acme.v1.Point choice_3 = 3; } }
// message Wide { string text = 1; acme.v1.Point point = 2; int32 high = 536870911; }
// message Doubles { double value = 1; }
// message Numbers { int64 signed = 1 [jstype = JS_NUMBER]; uint64 unsigned = 2 [jstype = JS_NUMBER]; }
// message Named { string created_at = 1; int32 x_y_z = 2; }
// enum Alias { option allow_alias = true; ALIAS_ZERO = 0; ALIAS_ONE = 1; ALIAS_UNO = 1; }
// message Aliased { Alias value = 1; }
// message Nulls { google.protobuf.Value value = 1; google.protobuf.Value maybe = 2; }
// message ValueCase { oneof kind { google.protobuf.Value kind_1 = 1; string kind_2 = 2; } }
// message Book { string display_name = 1 [json_name = "title"];
//   oneof cover { string cover_url = 2 [json_name = "image"]; acme.v1.Point cover_point = 3 [json_name = "at"]; } }
// message Choice { oneof choice { string choice_1 = 1 [json_name = "text"]; int32 choice_2 = 2; } }
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
// message Mixed { message Item { oneof value { string value_1 = 1; acme.v1.Point value_2 = 2; } } repeated Item items = 1; }
// message Mode { oneof mode { google.protobuf.Empty mode_1 = 1; int32 mode_2 = 2; string mode_3 = 3; } }
// message Versioned { string version = 1; int32 revision = 2; string color = 3; }
// message Bag { string name = 1; map<string, int32> extra = 2; } // keys "x-…"
// message Ints { repeated int32 value = 1; }
// message Str { string value = 1; }
// message RootChoice { oneof value { string value_1 = 1; int32 value_2 = 2; } }
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

const Nulls = Schema.Struct({
  value: Protobuf.Value.pipe(Protobuf.field(1)),
  maybe: Schema.optionalKey(Protobuf.Value).pipe(Protobuf.field(2))
})

const ValueCase = Schema.Struct({
  kind: Schema.Union([Protobuf.Value.pipe(Protobuf.field(1)), Schema.String.pipe(Protobuf.field(2))])
})

const RootChoice = Schema.Union([Schema.String.pipe(Protobuf.field(1)), Protobuf.Int32.pipe(Protobuf.field(2))])

const Labeled = Schema.Struct({ label: Schema.String.pipe(Protobuf.field(1)), point: Point.pipe(Protobuf.field(2)) })

const Choice = Schema.Struct({
  choice: Schema.Union([Labeled.pipe(Protobuf.field(1)), Schema.String.pipe(Protobuf.field(2))])
})

const Rested = Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Protobuf.Int32])

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
      ["a null Value as a oneof case", ValueCase, { kind: null }, "0a020800"],
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
      ["a Void root", Schema.Void, undefined, ""],
      ["a null Value", WellKnown, { anything: null }, "3a020800"]
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
        "numeric literal unions beyond int32, as double",
        Schema.Struct({ ratio: Schema.Literals([1, 2.5]).pipe(Protobuf.field(1)) }),
        { ratio: 2.5 },
        "090000000000000440"
      ],
      [
        "a struct with rest, as a map",
        Schema.StructWithRest(Schema.Struct({ name: Schema.String.pipe(Protobuf.field(1)) }), [
          Schema.Record(Schema.TemplateLiteral(["x-", Schema.String]), Protobuf.Int32.pipe(Protobuf.field(2)))
        ]),
        { name: "n", "x-a": 1, "x-b": 0 },
        "0a016e 12070a03782d611001 12070a03782d621000"
      ],
      // `null` is absent only where the schema is a union with `Null`.
      [
        "null Values, which are present unless the property is nullable",
        Schema.Struct({
          required: Protobuf.Value.pipe(Protobuf.field(1)),
          undefinedOr: Schema.UndefinedOr(Protobuf.Value).pipe(Protobuf.field(2)),
          nullOr: Schema.NullOr(Protobuf.Value).pipe(Protobuf.field(3))
        }),
        { required: null, undefinedOr: null, nullOr: null },
        "0a020800 12020800"
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
      ["no unknown fields as empty bytes", Keeper, "0805", { x: 5, unknownFields: new Uint8Array(0) }],
      [
        "unknown fields of merged occurrences",
        Schema.Struct({ keeper: Keeper.pipe(Protobuf.field(1)) }),
        "0a021801 0a00 0a021802",
        { keeper: { x: 0, unknownFields: bytes("1801 1802") } }
      ],
      // A partial first occurrence fails the case's schema, and still merges.
      ["merged occurrences of a oneof case", Choice, "0a030a0161 0a0412020801", {
        choice: { label: "a", point: { x: 1, y: 0 } }
      }],
      ["a oneof case after another case, unmerged", Choice, "0a030a0161 120162 0a0412020801", {
        choice: { label: "", point: { x: 1, y: 0 } }
      }],
      [
        "merged occurrences of a tuple",
        Schema.Struct({ t: Rested.pipe(Protobuf.field(1)) }),
        "0a030a0161 0a021001 0a021002",
        {
          t: ["a", 1, 2]
        }
      ],
      [
        "merged occurrences of well-known types and wrappers",
        WellKnown,
        "0a020805 0a0410c0843d 12020805 120410c0843d 1a030a0161 1a00 32100a0e0a0161120911000000000000f03f 32090a070a016212022001",
        {
          createdAt: DateTime.makeUnsafe(5001),
          ttl: Duration.millis(5001),
          maybeText: "a",
          attributes: { a: 1, b: true }
        }
      ],
      [
        "a tuple property named like an Object.prototype member",
        Schema.Struct({ constructor: Schema.Tuple([Schema.String]).pipe(Protobuf.field(1)) }),
        "0a030a0161",
        { constructor: ["a"] }
      ],
      [
        "rest entries without overwriting declared properties",
        Schema.StructWithRest(Schema.Struct({ name: Schema.String.pipe(Protobuf.field(1)) }), [
          Schema.Record(Schema.String, Schema.String.pipe(Protobuf.field(2)))
        ]),
        "0a016e 12090a046e616d65120178 12060a0178120179",
        { name: "n", x: "y" }
      ]
    ]
    for (const [name, schema, hex, value] of cases) {
      it(name, () => {
        assert.deepStrictEqual(decode(schema, hex), value)
      })
    }
  })

  it("decodes rest elements beyond the argument limit of a spread", () => {
    const rest = Array.from({ length: 200_000 }, () => 1)
    const codec = Protobuf.toCodec(Rested)
    assert.deepStrictEqual(Schema.decodeSync(codec)(Schema.encodeSync(codec)(["a", ...rest])), ["a", ...rest])
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
    const Guarded = Schema.Struct({
      ["__proto__"]: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)).pipe(Protobuf.field(1))
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
        { attributes: JSON.parse(`{"__proto__":1}`) },
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
      ["an unknown enum number", Status, "0807", /Expected "unspecified" \| "active" \| "suspended"\n  at \["state"\]/],
      ["a truncated tag after a field, without its path", Wide, "0a0178 ff", /^premature end of input$/],
      ["a malformed Void root", Schema.Void, "ff", /^premature end of input$/]
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

  it("fails to encode nesting that decoding rejects", () => {
    let list: Schema.Json = 1
    // Each JSON array is two levels: a Value and its ListValue.
    for (let i = 0; i < 256; i++) list = [list]
    assert.deepStrictEqual(decode(Protobuf.Value, encode(Protobuf.Value, list)), list)
    assert.throws(() => encode(Protobuf.Value, [list]), /nesting deeper than 512/)
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
        "a numbered nullish oneof member",
        Schema.Struct({
          a: Schema.Union([Schema.String.pipe(Protobuf.field(1)), Schema.Null.pipe(Protobuf.field(2))])
        }),
        /has a numbered nullish member/
      ],
      [
        "a packed singular field",
        Schema.Struct({ a: Protobuf.Int32.pipe(Protobuf.field(1, { packed: true })) }),
        /only repeated fields can be packed/
      ],
      [
        "presence on a repeated field",
        Schema.Struct({ a: Schema.Array(Protobuf.Int32).pipe(Protobuf.field(1, { presence: "always" })) }),
        /only singular fields take presence "always"/
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

  it("rejects empty JSON names", () => {
    assert.throws(() => Protobuf.jsonName(""), /Protobuf JSON name must be a non-empty string/)
  })

  it("rejects invalid field numbers", () => {
    for (const number of [0, 1.5, 19000, 19999, 536870912]) {
      assert.throws(() => Protobuf.field(number), /Protobuf field number must be an integer/)
    }
  })
  describe("toCodecJson", () => {
    const Named = Schema.Struct({
      created_at: Schema.String.pipe(Protobuf.field(1)),
      x_y_z: Protobuf.Int32.pipe(Protobuf.field(2))
    })
    const Aliased = Schema.Struct({
      value: Schema.Enum({ ALIAS_ZERO: 0, ALIAS_ONE: 1, ALIAS_UNO: 1 }).pipe(Protobuf.field(1))
    })
    const Item = Schema.Struct({ name: Schema.String.pipe(Protobuf.field(1)) })

    // Produced with `toJson(desc, fromBinary(desc, bytes))` from
    // @bufbuild/protobuf 2.16.0 for the protos above, where `bytes` is the
    // binary encoding of each value; its `fromJson` reads each JSON back to the
    // same bytes.
    describe("writes and reads the JSON of @bufbuild/protobuf", () => {
      const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, Schema.Json]> = [
        ["scalars at zero", Scalars, zeroScalars, {}],
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
          {
            fDouble: -1.5e300,
            fFloat: 1.5,
            fInt32: -2147483648,
            fInt64: "-9223372036854775808",
            fUint32: 4294967295,
            fUint64: "18446744073709551615",
            fSint32: -1,
            fSint64: "-9223372036854775808",
            fFixed32: 4294967295,
            fFixed64: "18446744073709551615",
            fSfixed32: -2147483648,
            fSfixed64: "-1",
            fBool: true,
            fString: "héllo ✓",
            fBytes: "AP8H"
          }
        ],
        [
          "non-finite numbers and padded base64",
          Scalars,
          { ...zeroScalars, fDouble: NaN, fFloat: -Infinity, fBytes: new Uint8Array([251, 255]) },
          { fDouble: "NaN", fFloat: "-Infinity", fBytes: "+/8=" }
        ],
        ["negative zero", Doubles, { value: -0 }, { value: -0 }],
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
          {
            numbers: [1, -2, 300],
            names: ["a", ""],
            points: [{ x: 1, y: 2 }, {}],
            colors: ["COLOR_RED", "COLOR_UNSPECIFIED", "COLOR_BLUE"],
            counts: { a: 1, b: 0 },
            labels: { 1: "one", [-5]: "minus five" },
            namedPoints: { o: {} },
            nickname: "",
            maybeNumber: 0,
            origin: {},
            primary: "COLOR_GREEN",
            circle: { center: { x: 1, y: 1 }, radius: 2.5 }
          }
        ],
        ["a oneof scalar case", Shapes, { ...emptyShapes, shape: { _tag: "code", value: -7n } }, { code: "-7" }],
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
          {
            createdAt: "2023-11-14T22:13:20.123Z",
            ttl: "-1.500s",
            maybeText: "",
            maybeInt: 0,
            maybeBool: true,
            attributes: { a: 1, b: [true, null, "x"], c: { d: {} } },
            anything: "str",
            nothing: {}
          }
        ],
        [
          "the earliest timestamp, a microsecond duration and a null Value",
          WellKnown,
          { createdAt: DateTime.makeUnsafe(-62135596800000), ttl: Duration.nanos(1_000_010_000n), anything: null },
          { createdAt: "0001-01-01T00:00:00Z", ttl: "1.000010s", anything: null }
        ],
        ["a recursive message", TreeNode, {
          name: "root",
          children: [{ name: "a", children: [] }, { name: "b", children: [{ name: "c", children: [] }] }]
        }, { name: "root", children: [{ name: "a" }, { name: "b", children: [{ name: "c" }] }] }],
        ["64-bit repeated fields", Unpacked, { values: [1, -1, 300], zigzag: [-1n, 1n, -64n] }, {
          values: [1, -1, 300],
          zigzag: ["-1", "1", "-64"]
        }],
        [
          "64-bit, bool and integer map keys",
          Keys,
          {
            byId: { "-5": "a", "9007199254740993": "b" },
            flags: { true: 1, false: 0 },
            points: { 7: { x: 1, y: 2 } }
          },
          {
            byId: { "-5": "a", "9007199254740993": "b" },
            flags: { true: 1, false: 0 },
            points: { 7: { x: 1, y: 2 } }
          }
        ],
        ["enum names of string literals", Status, {
          state: "suspended",
          history: ["active", "unspecified", "suspended"]
        }, { state: "suspended", history: ["active", "unspecified", "suspended"] }],
        ["a self-numbered oneof string case", Pick, { choice: "hi" }, { choice1: "hi" }],
        ["a oneof case holding its zero value", Pick, { choice: 0 }, { choice2: 0 }],
        ["a oneof case holding an empty message", Pick, { choice: { x: 0, y: 0 } }, { choice3: {} }],
        ["64-bit integers as numbers", Numbers, { signed: -1, unsigned: Number.MAX_SAFE_INTEGER }, {
          signed: "-1",
          unsigned: "9007199254740991"
        }],
        ["null Values, required and optional", Nulls, { value: null, maybe: null }, { value: null, maybe: null }],
        ["a null Value as a oneof case", ValueCase, { kind: null }, { kind1: null }],
        ["a Timestamp root", Protobuf.Timestamp, DateTime.makeUnsafe(-1500), "1969-12-31T23:59:58.500Z"],
        ["a Duration root", Protobuf.Duration, Duration.nanos(1_000_000_500n), "1.000000500s"],
        ["an empty StringValue root", Protobuf.StringValue, "", ""],
        ["a StringValue root", Protobuf.StringValue, "a", "a"],
        ["a Value root", Protobuf.Value, { a: [1, "x", null, true] }, { a: [1, "x", null, true] }],
        ["a Void root, as google.protobuf.Empty", Schema.Void, undefined, {}]
      ]
      for (const [name, schema, value, json] of cases) {
        it(name, () => {
          assert.deepStrictEqual(encodeJson(schema, value), json)
          assert.deepStrictEqual(decodeJson(schema, json), value)
        })
      }
    })

    // Same provenance, for the messages synthesized around values that protobuf
    // cannot hold directly.
    describe("writes and reads synthesized messages like @bufbuild/protobuf", () => {
      const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, Schema.Json]> = [
        [
          "nested arrays, boxed",
          Schema.Struct({ rows: Schema.Array(Schema.Array(Protobuf.Int32)).pipe(Protobuf.field(1)) }),
          { rows: [[1, 2], [], [3]] },
          { rows: [{ value: [1, 2] }, {}, { value: [3] }] }
        ],
        [
          "nullable elements and map values, boxed",
          Schema.Struct({
            items: Schema.Array(Schema.NullOr(Schema.String)).pipe(Protobuf.field(1)),
            labels: Schema.Record(Schema.String, Schema.NullOr(Schema.String)).pipe(Protobuf.field(2))
          }),
          { items: ["a", null, ""], labels: { x: null, y: "b" } },
          { items: [{ value: "a" }, {}, { value: "" }], labels: { x: {}, y: { value: "b" } } }
        ],
        ...([
          [Option.some(Option.some("a")), { value: { value: "a" } }],
          [Option.some(Option.none()), { value: {} }],
          [Option.none(), {}]
        ] as const).map(([value, json]) =>
          [
            `a nested Option: ${String(value)}`,
            Schema.Struct({ value: Schema.Option(Schema.Option(Schema.String)).pipe(Protobuf.field(1)) }),
            { value },
            json
          ] as const
        ),
        [
          "unions as array elements, boxed as oneofs",
          Schema.Struct({
            items: Schema.Array(Schema.Union([Schema.String.pipe(Protobuf.field(1)), Point.pipe(Protobuf.field(2))]))
              .pipe(Protobuf.field(1))
          }),
          { items: ["a", { x: 1, y: 0 }] },
          { items: [{ value1: "a" }, { value2: { x: 1 } }] }
        ],
        ...([["auto", { mode1: {} }], [7, { mode2: 7 }], ["low", { mode3: "low" }]] as const).map(([mode, json]) =>
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
            json
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
          { version: "v2", revision: 3, color: "green" }
        ],
        ["an array root, boxed", Schema.Array(Protobuf.Int32), [1, 2], { value: [1, 2] }],
        ["a scalar root, boxed", Schema.String, "a", { value: "a" }],
        ["a union root, boxed as a oneof", RootChoice, "hi", { value1: "hi" }],
        ["a union root holding its second case", RootChoice, 5, { value2: 5 }],
        [
          "registered symbols",
          Schema.Struct({ key: Schema.Symbol.pipe(Protobuf.field(1)) }),
          { key: Symbol.for("k") },
          { key: "k" }
        ],
        ["proto2 required fields and groups", Legacy, { id: 0, item: { name: "x" }, entry: [{ n: 1 }, { n: 2 }] }, {
          id: 0,
          item: { name: "x" },
          entry: [{ n: 1 }, { n: 2 }]
        }]
      ]
      for (const [name, schema, value, json] of cases) {
        it(name, () => {
          assert.deepStrictEqual(encodeJson(schema, value), json)
          assert.deepStrictEqual(decodeJson(schema, json), value)
        })
      }
    })

    // These have no field names to derive JSON names from, so their form
    // follows the value instead.
    describe("writes values without proto3 JSON names in their own shape", () => {
      const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, Schema.Json]> = [
        ["tuples, as arrays", Tuples, { pair: ["a", 0], triple: ["x", true, 1, 2] }, {
          pair: ["a", 0],
          triple: ["x", true, 1, 2]
        }],
        ["tuples without optional and rest elements", Tuples, { pair: ["", 5], triple: ["x"] }, {
          pair: ["", 5],
          triple: ["x"]
        }],
        [
          "a ReadonlyMap, as an array of entries",
          Schema.Struct({ entries: Schema.ReadonlyMap(Protobuf.Int32, Point).pipe(Protobuf.field(1)) }),
          { entries: new Map([[1, { x: 1, y: 0 }], [2, { x: 0, y: 0 }]]) },
          { entries: [[1, { x: 1 }], [2, {}]] }
        ],
        [
          "double map keys",
          Schema.Struct({ entries: Schema.Record(Protobuf.Double, Schema.String).pipe(Protobuf.field(1)) }),
          { entries: { 0: "", 1.5: "a" } },
          { entries: { 0: "", 1.5: "a" } }
        ],
        [
          "a struct with rest, with the entries as properties",
          Schema.StructWithRest(Schema.Struct({ name: Schema.String.pipe(Protobuf.field(1)) }), [
            Schema.Record(Schema.TemplateLiteral(["x-", Schema.String]), Protobuf.Int32.pipe(Protobuf.field(2)))
          ]),
          { name: "n", "x-a": 1, "x-b": 0 },
          { name: "n", "x-a": 1, "x-b": 0 }
        ]
      ]
      for (const [name, schema, value, json] of cases) {
        it(name, () => {
          assert.deepStrictEqual(encodeJson(schema, value), json)
          assert.deepStrictEqual(decodeJson(schema, json), value)
        })
      }
    })

    it("names fields in lowerCamelCase and reads either name", () => {
      assert.deepStrictEqual(encodeJson(Named, { created_at: "a", x_y_z: 1 }), { createdAt: "a", xYZ: 1 })
      assert.deepStrictEqual(decodeJson(Named, { createdAt: "a", xYZ: 1 }), { created_at: "a", x_y_z: 1 })
      assert.deepStrictEqual(decodeJson(Named, { created_at: "a", x_y_z: 1 }), { created_at: "a", x_y_z: 1 })
    })

    // Same provenance as above; `fromJson` accepts the JSON names and the
    // proto field names alike, and rejects the camelCase names.
    describe("writes and reads custom JSON names like @bufbuild/protobuf", () => {
      const Book = Schema.Struct({
        displayName: Schema.String.pipe(Protobuf.field(1), Protobuf.jsonName("title")),
        cover: Schema.optionalKey(Schema.Union([
          Schema.TaggedStruct("cover_url", {
            value: Schema.String.pipe(Protobuf.field(2), Protobuf.jsonName("image"))
          }),
          Schema.TaggedStruct("cover_point", { value: Point.pipe(Protobuf.field(3), Protobuf.jsonName("at")) })
        ]))
      }).pipe(Schema.encodeKeys({ displayName: "display_name" }))
      const Choice = Schema.Struct({
        choice: Schema.optionalKey(Schema.Union([
          Schema.String.pipe(Protobuf.field(1), Protobuf.jsonName("text")),
          Protobuf.Int32.pipe(Protobuf.field(2))
        ]))
      })
      const strict = { onExcessProperty: "error" } as const

      it("on fields and tagged struct cases", () => {
        const book = { displayName: "Dune", cover: { _tag: "cover_url", value: "u" } } as const
        assert.deepStrictEqual(encodeJson(Book, book), { title: "Dune", image: "u" })
        assert.deepStrictEqual(decodeJson(Book, { title: "Dune", image: "u" }), book)
        assert.deepStrictEqual(decodeJson(Book, { display_name: "Dune", cover_url: "u" }), book)
        assert.throws(() => decodeJson(Book, { displayName: "Dune" }, strict), /unknown field\n  at \["displayName"\]/)
        assert.throws(() => decodeJson(Book, { image: "u", at: {} }), /more than one case of a oneof is set/)
      })

      it("on self-numbered cases", () => {
        assert.deepStrictEqual(encodeJson(Choice, { choice: "hi" }), { text: "hi" })
        assert.deepStrictEqual(encodeJson(Choice, { choice: 3 }), { choice2: 3 })
        assert.deepStrictEqual(decodeJson(Choice, { choice_1: "hi" }), { choice: "hi" })
        assert.throws(() => decodeJson(Choice, { choice1: "hi" }, strict), /unknown field\n  at \["choice1"\]/)
      })
    })

    it("writes the first name of an aliased enum number", () => {
      // @bufbuild/protobuf writes the last alias; protoc's printer writes the first.
      assert.deepStrictEqual(encodeJson(Aliased, { value: 1 }), { value: "ALIAS_ONE" })
      assert.deepStrictEqual(decodeJson(Aliased, { value: "ALIAS_UNO" }), { value: 1 })
    })

    it("writes null Values unless the property is nullable", () => {
      const schema = Schema.Struct({
        required: Protobuf.Value.pipe(Protobuf.field(1)),
        undefinedOr: Schema.UndefinedOr(Protobuf.Value).pipe(Protobuf.field(2)),
        nullOr: Schema.NullOr(Protobuf.Value).pipe(Protobuf.field(3))
      })
      const value = { required: null, undefinedOr: null, nullOr: null }
      assert.deepStrictEqual(encodeJson(schema, value), { required: null, undefinedOr: null })
      assert.deepStrictEqual(decodeJson(schema, { required: null, undefinedOr: null }), value)
    })

    it("drops unknown fields, which JSON cannot hold", () => {
      assert.deepStrictEqual(encodeJson(Keeper, { x: 5, unknownFields: bytes("1801") }), { x: 5 })
      assert.deepStrictEqual(decodeJson(Keeper, { x: 5 }), { x: 5, unknownFields: new Uint8Array(0) })
    })

    // Accepted by `fromJson` of @bufbuild/protobuf 2.16.0 with the same
    // result (to millisecond precision), except 64-bit integers in strings with
    // an exponent or a fraction, which the spec allows and bufbuild rejects, and
    // unknown fields, which bufbuild ignores with `ignoreUnknownFields` only.
    describe("decodes the alternative inputs of the spec", () => {
      const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, Schema.Json, unknown]> = [
        [
          "integers as strings, with an exponent or a zero fraction",
          Scalars,
          {
            fInt32: "1",
            fUint32: 1.0,
            fSint32: "1e2",
            fFixed32: "1.0",
            fSfixed32: -0,
            fInt64: 5,
            fUint64: "18446744073709551615",
            fSint64: "-1e2",
            fFixed64: "2.50e1",
            fSfixed64: 1e2
          },
          {
            ...zeroScalars,
            fInt32: 1,
            fUint32: 1,
            fSint32: 100,
            fFixed32: 1,
            fSfixed32: 0,
            fInt64: 5n,
            fUint64: 18446744073709551615n,
            fSint64: -100n,
            fFixed64: 25n,
            fSfixed64: 100n
          }
        ],
        ["floats as strings", Scalars, { fDouble: "1.5", fFloat: "Infinity" }, {
          ...zeroScalars,
          fDouble: 1.5,
          fFloat: Infinity
        }],
        ["URL-safe and unpadded base64", Scalars, { fBytes: "-_8" }, { ...zeroScalars, fBytes: bytes("fbff") }],
        ["enum numbers and names", Status, { state: 1, history: ["suspended", 0] }, {
          state: "active",
          history: ["suspended", "unspecified"]
        }],
        ["null for absent fields", Shapes, {
          numbers: null,
          counts: null,
          origin: null,
          primary: null,
          nickname: null,
          label: null,
          code: "1"
        }, { ...emptyShapes, shape: { _tag: "code", value: 1n } }],
        ["integer map keys in any number syntax", Shapes, { labels: { "01": "a", "1e1": "b" } }, {
          ...emptyShapes,
          labels: { 1: "a", 10: "b" }
        }],
        [
          "timestamps with an offset or other fraction digits, and durations with other fraction digits",
          WellKnown,
          { createdAt: "2023-11-14T23:13:20.12345+01:00", ttl: "-0.5s", maybeText: null, maybeInt: "5" },
          { createdAt: DateTime.makeUnsafe(1700000000123), ttl: Duration.millis(-500), maybeInt: 5 }
        ],
        [
          "empty lists and maps as absent",
          Schema.Struct({
            names: Schema.optionalKey(Schema.Array(Schema.String)).pipe(Protobuf.field(1)),
            counts: Schema.optionalKey(Schema.Record(Schema.String, Protobuf.Int32)).pipe(Protobuf.field(2))
          }),
          { names: [], counts: {} },
          {}
        ],
        [
          "a null Value in a list and a map",
          Schema.Struct({
            values: Schema.Array(Protobuf.Value).pipe(Protobuf.field(1)),
            byName: Schema.Record(Schema.String, Protobuf.Value).pipe(Protobuf.field(2))
          }),
          { values: [1, null], byName: { a: null } },
          { values: [1, null], byName: { a: null } }
        ],
        ["a null wrapper root as its zero value", Protobuf.Int32Value, null, 0],
        ["unknown fields, ignored", Point, { x: 1, z: 2 }, { x: 1, y: 0 }]
      ]
      for (const [name, schema, json, value] of cases) {
        it(name, () => {
          assert.deepStrictEqual(decodeJson(schema, json), value)
        })
      }
    })

    // Rejected by `fromJson` of @bufbuild/protobuf 2.16.0 too, except
    // hexadecimal integers, base64 with spaces, and days that do not exist,
    // which bufbuild accepts, and the values the schemas reject: an unsafe
    // `Int64Number` and a number outside a closed enum.
    describe("fails to decode", () => {
      const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, Schema.Json, RegExp]> = [
        [
          "both names of a field",
          Named,
          { createdAt: "a", created_at: "b" },
          /field is set twice.*\n  at \["created_at"\]/
        ],
        [
          "two cases of a oneof",
          Shapes,
          { label: "a", code: "1" },
          /more than one case of a oneof is set\n  at \["code"\]/
        ],
        [
          "null in a repeated field",
          Shapes,
          { numbers: [1, null] },
          /expected a protobuf int32\n  at \["numbers"\]\[1\]/
        ],
        ["a null map value", Shapes, { labels: { 1: null } }, /expected a protobuf string\n  at \["labels"\]\["1"\]/],
        [
          "an invalid map key",
          Keys,
          { flags: { True: 1 } },
          /expected a protobuf bool map key\n  at \["flags"\]\["True"\]/
        ],
        ["an int32 with a fraction", Scalars, { fInt32: 1.5 }, /expected a protobuf int32\n  at \["fInt32"\]/],
        ["an int32 out of range", Scalars, { fInt32: 2147483648 }, /expected a protobuf int32/],
        ["an empty string as an integer", Scalars, { fInt64: "" }, /expected a protobuf int64/],
        ["a hexadecimal integer", Scalars, { fInt32: "0x10" }, /expected a protobuf int32/],
        ["a uint64 out of range", Scalars, { fUint64: "18446744073709551616" }, /expected a protobuf uint64/],
        ["an unsafe 64-bit number", Numbers, { signed: "9007199254740992" }, /int64 value 9007199254740992 is outside/],
        ["a double out of range", Scalars, { fDouble: "1e400" }, /expected a protobuf double/],
        ["a float out of range", Scalars, { fFloat: 3.5e38 }, /expected a protobuf float/],
        ["a quoted bool", Scalars, { fBool: "true" }, /expected a protobuf bool/],
        ["invalid base64", Scalars, { fBytes: "AP 8H" }, /expected base64 bytes/],
        ["an unknown enum name", Aliased, { value: "ALIAS_TWO" }, /unknown enum value name\n  at \["value"\]/],
        ["an unknown enum number", Status, { state: 7 }, /Expected "unspecified" \| "active" \| "suspended"/],
        ["a lowercase timestamp", WellKnown, { createdAt: "2023-11-14t22:13:20z" }, /expected an RFC 3339 timestamp/],
        [
          "a day that does not exist",
          WellKnown,
          { createdAt: "2023-02-30T00:00:00Z" },
          /expected an RFC 3339 timestamp/
        ],
        ["year 0", WellKnown, { createdAt: "0000-12-31T23:59:59Z" }, /timestamp out of range/],
        ["ten fraction digits", WellKnown, { ttl: "1.1234567891s" }, /expected a duration in seconds/],
        ["a duration out of range", WellKnown, { ttl: "315576000001s" }, /duration out of range/],
        ["a Struct that is an array", WellKnown, { attributes: [1] }, /expected a JSON object\n  at \["attributes"\]/],
        [
          "a message that is not an object",
          Wide,
          { point: [] },
          /expected an object for acme.v1.Point\n  at \["point"\]/
        ],
        [
          "an Any",
          Schema.Struct({ detail: Protobuf.Any.pipe(Protobuf.field(1)) }),
          { detail: { "@type": "type.googleapis.com/acme.v1.Point" } },
          /google.protobuf.Any has no JSON mapping/
        ]
      ]
      for (const [name, schema, json, message] of cases) {
        it(name, () => {
          assert.throws(() => decodeJson(schema, json), message)
        })
      }
    })

    it("rejects unknown fields with onExcessProperty: error", () => {
      const options = { onExcessProperty: "error" } as const
      assert.throws(() => decodeJson(Point, { x: 1, z: 2 }, options), /unknown field\n  at \["z"\]/)
      assert.throws(() => decodeJson(Shapes, { origin: { w: 1 } }, options), /unknown field\n  at \["origin"\]\["w"\]/)
      assert.deepStrictEqual(decodeJson(Named, { created_at: "a" }, options), { created_at: "a", x_y_z: 0 })
    })

    describe("fails to encode", () => {
      const cases: ReadonlyArray<readonly [string, Schema.Codec<any, any>, unknown, RegExp]> = [
        [
          "a timestamp after year 9999",
          WellKnown,
          { createdAt: DateTime.makeUnsafe(253402300800000) },
          /timestamp out of range \(years 0001 to 9999\)\n  at \["createdAt"\]/
        ],
        ["an infinite duration", WellKnown, { ttl: Duration.infinity }, /expected a finite duration\n  at \["ttl"\]/],
        [
          "NaN in a Value",
          Schema.Struct({ anything: Schema.Unknown.pipe(Protobuf.field(1)) }),
          { anything: { a: [NaN] } },
          /expected a finite number\n  at \["anything"\]\["a"\]\[0\]/
        ],
        [
          "an Any",
          Schema.Struct({ detail: Protobuf.Any.pipe(Protobuf.field(1)) }),
          { detail: { typeUrl: "type.googleapis.com/acme.v1.Point", value: new Uint8Array(0) } },
          /google.protobuf.Any has no JSON mapping without a type registry\n  at \["detail"\]/
        ]
      ]
      for (const [name, schema, value, message] of cases) {
        it(name, () => {
          assert.throws(() => encodeJson(schema, value), message)
        })
      }
    })

    it("keeps __proto__ keys as own properties", () => {
      const value = { ...emptyShapes, namedPoints: JSON.parse(`{"__proto__":{"x":1,"y":0}}`) }
      const json = JSON.parse(`{"namedPoints":{"__proto__":{"x":1}}}`)
      assert.deepStrictEqual(encodeJson(Shapes, value), json)
      assert.deepStrictEqual(decodeJson(Shapes, json), value)
      assert.isUndefined(({} as Record<string, unknown>).x)
    })

    describe("rejects layouts when the codec is created", () => {
      const key = Symbol.for("key")
      const cases: ReadonlyArray<readonly [string, Schema.Top, RegExp]> = [
        [
          "two fields with one JSON name",
          Schema.Struct({ fooBar: Schema.String.pipe(Protobuf.field(1)), foo_bar: Item.pipe(Protobuf.field(2)) }),
          /message has two fields named "fooBar" in JSON/
        ],
        [
          "a JSON name taken by another field",
          Schema.Struct({
            a: Schema.String.pipe(Protobuf.field(1), Protobuf.jsonName("b")),
            b: Schema.String.pipe(Protobuf.field(2))
          }),
          /message has two fields named "b" in JSON/
        ],
        [
          "a symbol property",
          Schema.Struct({ [key]: Schema.String.pipe(Protobuf.field(1)) }),
          /property Symbol\(key\) of message has no JSON name/
        ],
        [
          "a JSON name on a oneof property",
          Schema.Struct({
            a: Schema.Union([Schema.String.pipe(Protobuf.field(1)), Protobuf.Int32.pipe(Protobuf.field(2))]).pipe(
              Protobuf.jsonName("x")
            )
          }),
          /is a oneof; give its members a JSON name instead of the property/
        ]
      ]
      for (const [name, schema, message] of cases) {
        it(name, () => {
          assert.throws(() => Protobuf.toCodecJson(schema), message)
        })
      }
    })
  })
})
