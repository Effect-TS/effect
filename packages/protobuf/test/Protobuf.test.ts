import {
  create,
  type DescMessage,
  fromBinary,
  fromJson,
  type MessageInitShape,
  toBinary,
  toJson
} from "@bufbuild/protobuf"
import { timestampFromMs } from "@bufbuild/protobuf/wkt"
import { Protobuf } from "@effect/protobuf"
import { assert, describe, it } from "@effect/vitest"
import { DateTime, Duration, Option, Schema } from "effect"
// oxlint-disable-next-line effect/no-js-extension-imports -- generated JS fixture
import * as Es from "./fixtures/gen-es/acme/v1/kitchen_sink_pb.js"
import { Scalars, Shapes, TreeNode, WellKnown } from "./fixtures/schemas.ts"

interface Case<S extends Schema.Top, D extends DescMessage> {
  readonly name: string
  readonly schema: S
  readonly value: S["Type"]
  readonly desc: D
  readonly init: MessageInitShape<D>
}

const testCase = <S extends Schema.Top, D extends DescMessage>(c: Case<S, D>) => c

const cases = [
  testCase({
    name: "scalars (defaults)",
    schema: Scalars,
    value: {
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
    },
    desc: Es.ScalarsSchema,
    init: {}
  }),
  testCase({
    name: "scalars (extremes)",
    schema: Scalars,
    value: {
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
    desc: Es.ScalarsSchema,
    init: {
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
    }
  }),
  testCase({
    name: "shapes (collections, presence, oneof message case)",
    schema: Shapes,
    value: {
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
    desc: Es.ShapesSchema,
    init: {
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
      shape: { case: "circle", value: { center: { x: 1, y: 1 }, radius: 2.5 } }
    }
  }),
  testCase({
    name: "shapes (oneof scalar case)",
    schema: Shapes,
    value: {
      numbers: [],
      names: [],
      points: [],
      colors: [],
      counts: {},
      labels: {},
      namedPoints: {},
      primary: 0,
      shape: { _tag: "code", value: -7n }
    },
    desc: Es.ShapesSchema,
    init: { shape: { case: "code", value: -7n } }
  }),
  testCase({
    name: "well-known types",
    schema: WellKnown,
    value: {
      createdAt: DateTime.makeUnsafe(1700000000123),
      ttl: Duration.millis(-1500),
      maybeText: "",
      maybeInt: 0,
      maybeBool: true,
      attributes: { a: 1, b: [true, null, "x"], c: { d: {} } },
      anything: "str",
      nothing: {}
    },
    desc: Es.WellKnownSchema,
    init: {
      createdAt: timestampFromMs(1700000000123),
      ttl: { seconds: -1n, nanos: -500000000 },
      maybeText: "",
      maybeInt: 0,
      maybeBool: true,
      attributes: { a: 1, b: [true, null, "x"], c: { d: {} } },
      anything: { kind: { case: "stringValue", value: "str" } },
      nothing: {}
    }
  }),
  testCase({
    name: "recursive message",
    schema: TreeNode,
    value: {
      name: "root",
      children: [{ name: "a", children: [] }, { name: "b", children: [{ name: "c", children: [] }] }]
    },
    desc: Es.TreeNodeSchema,
    init: { name: "root", children: [{ name: "a" }, { name: "b", children: [{ name: "c" }] }] }
  })
] as const

describe("Protobuf", () => {
  describe("binary compatibility with @bufbuild/protobuf", () => {
    for (const c of cases) {
      it(c.name, () => {
        const codec = Protobuf.toCodec(c.schema as Schema.Codec<unknown>)
        const ours = Schema.encodeSync(codec)(c.value)
        const theirs = toBinary(c.desc, create(c.desc, c.init as any))
        assert.deepStrictEqual(ours, theirs)
        assert.deepStrictEqual(Schema.decodeSync(codec)(theirs), c.value)
        assert.deepStrictEqual(toJson(c.desc, fromBinary(c.desc, ours)), toJson(c.desc, create(c.desc, c.init as any)))
      })
    }
  })

  describe("JSON compatibility with @bufbuild/protobuf", () => {
    for (const c of cases) {
      it(c.name, () => {
        const codec = Protobuf.toCodecJson(c.schema as Schema.Codec<unknown>)
        const ours = Schema.encodeSync(codec)(c.value)
        const theirs = toJson(c.desc, create(c.desc, c.init as any))
        assert.deepStrictEqual(ours, theirs)
        assert.deepStrictEqual(Schema.decodeSync(codec)(theirs), c.value)
        assert.deepStrictEqual(toJson(c.desc, fromJson(c.desc, ours as any)), theirs)
      })
    }
  })

  it("decodes absent implicit fields to zero values and validates them", () => {
    const User = Schema.Struct({
      name: Schema.NonEmptyString.pipe(Protobuf.field(1)),
      age: Protobuf.Int32.pipe(Protobuf.field(2))
    })
    const codec = Protobuf.toCodec(User)
    assert.deepStrictEqual(Schema.decodeSync(codec)(new Uint8Array([0x0a, 0x01, 0x41])), { name: "A", age: 0 })
    assert.throws(() => Schema.decodeSync(codec)(new Uint8Array([])))
  })

  it("supports transformations, classes, Option and nullable fields", () => {
    class Event extends Schema.Class<Event>("acme.v1.Event")({
      kind: Schema.Literal("event"),
      at: Schema.DateTimeUtcFromMillis.pipe(Protobuf.field(1)),
      note: Schema.Option(Schema.String).pipe(Protobuf.field(2)),
      parent: Schema.NullOr(Schema.String).pipe(Protobuf.field(3)),
      count: Schema.FiniteFromString.pipe(Protobuf.field(4))
    }) {}
    const codec = Protobuf.toCodec(Event)
    const event = new Event({
      kind: "event",
      at: DateTime.makeUnsafe(1000),
      note: Option.none(),
      parent: null,
      count: 5
    })
    const bytes = Schema.encodeSync(codec)(event)
    // field 1: double 1000, field 4: string "5"
    assert.deepStrictEqual([...bytes], [0x09, 0, 0, 0, 0, 0, 0x40, 0x8f, 0x40, 0x22, 0x01, 0x35])
    assert.deepStrictEqual(Schema.decodeSync(codec)(bytes), event)
  })

  it("reports layout errors when the codec is created", () => {
    assert.throws(
      () => Protobuf.toCodec(Schema.Struct({ a: Schema.String })),
      /property "a" of <anonymous struct> has no field number/
    )
    assert.throws(
      () =>
        Protobuf.toCodec(Schema.Struct({
          a: Schema.String.pipe(Protobuf.field(1)),
          b: Schema.String.pipe(Protobuf.field(1))
        })),
      /duplicate field number 1/
    )
    assert.throws(
      () => Protobuf.toCodec(Schema.Struct({ a: Schema.Array(Schema.Array(Schema.String)).pipe(Protobuf.field(1)) })),
      /nested array/
    )
  })
})
