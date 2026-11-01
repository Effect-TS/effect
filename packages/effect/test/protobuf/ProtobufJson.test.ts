/** @effect-diagnostics schemaNumber:off */
import { assert, describe, it } from "@effect/vitest"
import { DateTime, Duration, Schema } from "effect"
import * as Protobuf from "effect/protobuf/Protobuf"
import * as ProtobufJson from "effect/protobuf/ProtobufJson"

const f = Protobuf.field

const encode = <A, I>(schema: Schema.Codec<A, I>, value: A, options?: ProtobufJson.Options): unknown =>
  Schema.encodeUnknownSync(ProtobufJson.toCodec(schema, options))(value)

const decode = <A, I>(schema: Schema.Codec<A, I>, json: unknown, options?: ProtobufJson.Options): A =>
  Schema.decodeUnknownSync(ProtobufJson.toCodec(schema, options))(json)

const fails = (run: () => unknown, message: RegExp) => assert.throws(run, message)

// message Scalars { int32 i32 = 1; int64 i64 = 2; uint64 u64 = 3; double d = 4; float f = 5;
//   bool b = 6; string s = 7; bytes by = 8; int64 n64 = 9 [jstype = JS_NUMBER]; }
const Scalars = Protobuf.Message("test.v1.Scalars", {
  i32: Protobuf.Int32.pipe(f(1)),
  i64: Protobuf.Int64.pipe(f(2)),
  u64: Protobuf.UInt64.pipe(f(3)),
  d: Protobuf.Double.pipe(f(4)),
  f: Protobuf.Float.pipe(f(5)),
  b: Schema.Boolean.pipe(f(6)),
  s: Schema.String.pipe(f(7)),
  by: Schema.Uint8Array.pipe(f(8)),
  n64: Protobuf.Int64Number.pipe(f(9))
})

const zeros = {
  i32: 0,
  i64: 0n,
  u64: 0n,
  d: 0,
  f: 0,
  b: false,
  s: "",
  by: new Uint8Array(0),
  n64: 0
}

// enum Color { COLOR_UNSPECIFIED = 0; COLOR_RED = 1; option allow_alias = true; COLOR_CRIMSON = 1; }
const Color = Protobuf.Enum("test.v1.Color", { COLOR_UNSPECIFIED: 0, COLOR_RED: 1, COLOR_CRIMSON: 1 })
const Level = Protobuf.OpenEnum("test.v1.Level", { LEVEL_UNSPECIFIED: 0, LEVEL_HIGH: 1 })

// message Order { string order_id = 1; int32 field_1 = 2; string display_name = 3 [json_name = "label"];
//   Color color = 4; Level level = 5; optional int32 count = 6; repeated int32 sizes = 7;
//   map<int32, string> notes = 8; oneof pick { string text = 9; int32 number = 10; } Order child = 11; }
interface Order extends Schema.Schema.Type<typeof Order> {}
const Order = Protobuf.Message("test.v1.Order", {
  orderId: Schema.String.pipe(f(1)),
  field1: Protobuf.Int32.pipe(f(2, { name: "field_1" })),
  displayName: Schema.String.pipe(f(3, { jsonName: "label" })),
  color: Color.pipe(f(4)),
  level: Level.pipe(f(5)),
  count: Schema.optionalKey(Protobuf.Int32).pipe(f(6)),
  sizes: Schema.Array(Protobuf.Int32).pipe(f(7)),
  notes: Protobuf.Map(Protobuf.Int32, Schema.String).pipe(f(8)),
  pick: Protobuf.Oneof({
    text: Schema.String.pipe(f(9)),
    number: Protobuf.Int32.pipe(f(10))
  }),
  child: Schema.optionalKey(Schema.suspend((): Schema.Codec<Order> => Order)).pipe(f(11))
})

const order: Order = {
  orderId: "",
  field1: 0,
  displayName: "",
  color: "COLOR_UNSPECIFIED",
  level: "LEVEL_UNSPECIFIED",
  sizes: [],
  notes: {}
}

describe("ProtobufJson", () => {
  describe("scalars", () => {
    const cases: ReadonlyArray<readonly [string, Partial<typeof Scalars.Type>, Record<string, unknown>]> = [
      ["int64 as a string", { i64: 9007199254740993n }, { i64: "9007199254740993" }],
      ["uint64 at its maximum", { u64: 18446744073709551615n }, { u64: "18446744073709551615" }],
      ["a 64-bit number as a string", { n64: 42 }, { n64: "42" }],
      ["NaN", { d: NaN }, { d: "NaN" }],
      ["infinities", { d: Infinity, f: -Infinity }, { d: "Infinity", f: "-Infinity" }],
      ["negative zero, which is not the default", { d: -0 }, { d: -0 }],
      ["a float as the double of its float32", { f: 1.1 }, { f: Math.fround(1.1) }],
      ["bytes in standard base64 with padding", { by: new Uint8Array([251, 255]) }, { by: "+/8=" }]
    ]
    for (const [name, value, json] of cases) {
      it(`writes ${name}`, () => {
        assert.deepStrictEqual(encode(Scalars, { ...zeros, ...value }), json)
      })
    }

    const inputs: ReadonlyArray<readonly [string, Record<string, unknown>, Partial<typeof Scalars.Type>]> = [
      ["quoted integers", { i32: "12", u64: "7" }, { i32: 12, u64: 7n }],
      ["integers with an exponent or a zero fraction", { i32: 1e2, i64: "1.0", u64: "2e3" }, {
        i32: 100,
        i64: 1n,
        u64: 2000n
      }],
      ["64-bit integers as numbers", { i64: -5, n64: 9 }, { i64: -5n, n64: 9 }],
      ["quoted floats", { d: "1.5", f: "NaN" }, { d: 1.5, f: NaN }],
      ["URL-safe base64 without padding", { by: "-_8" }, { by: new Uint8Array([251, 255]) }],
      ["null as the default", { i32: null, s: null }, {}]
    ]
    for (const [name, json, value] of inputs) {
      it(`reads ${name}`, () => {
        assert.deepStrictEqual(decode(Scalars, json), { ...zeros, ...value })
      })
    }

    const invalid: ReadonlyArray<readonly [string, Record<string, unknown>, RegExp]> = [
      ["a fractional integer", { i32: 1.5 }, /expected a protobuf int32\n  at \["i32"\]/],
      ["a negative uint64", { u64: "-1" }, /expected a protobuf uint64/],
      ["an integer with a leading zero or space", { i64: " 1" }, /expected a protobuf int64/],
      ["a float out of range", { f: 3.5e38 }, /expected a protobuf float/],
      ["a quoted boolean", { b: "true" }, /expected a protobuf bool/],
      ["a lone surrogate", { s: "\uD800" }, /expected a protobuf string/],
      ["invalid base64", { by: "a" }, /expected base64 bytes/],
      ["a 64-bit number outside the safe range", { n64: "9007199254740993" }, /outside the safe integer range/]
    ]
    for (const [name, json, message] of invalid) {
      it(`rejects ${name}`, () => {
        fails(() => decode(Scalars, json), message)
      })
    }
  })

  describe("field names", () => {
    it("writes JSON names, or the names of the .proto file", () => {
      const value = { ...order, orderId: "a", field1: 1, displayName: "b" }
      assert.deepStrictEqual(encode(Order, value), { orderId: "a", field1: 1, label: "b" })
      assert.deepStrictEqual(encode(Order, value, { useProtoFieldName: true }), {
        order_id: "a",
        field_1: 1,
        display_name: "b"
      })
    })

    it("reads either name", () => {
      const expected = { ...order, orderId: "a", field1: 1, displayName: "b" }
      assert.deepStrictEqual(decode(Order, { orderId: "a", field1: 1, label: "b" }), expected)
      assert.deepStrictEqual(decode(Order, { order_id: "a", field_1: 1, display_name: "b" }), expected)
    })

    it("rejects a field under both names", () => {
      fails(() => decode(Order, { orderId: "a", order_id: "b" }), /field is set twice, as orderId and order_id/)
    })

    it("rejects unknown fields, unless they are ignored", () => {
      fails(() => decode(Order, { other: 1 }), /unknown field of test.v1.Order\n  at \["other"\]/)
      assert.deepStrictEqual(decode(Order, { other: 1 }, { ignoreUnknownFields: true }), order)
    })
  })

  describe("presence", () => {
    it("leaves out fields without presence that hold their default", () => {
      assert.deepStrictEqual(encode(Order, order), {})
    })

    it("writes them with alwaysEmitImplicit", () => {
      assert.deepStrictEqual(encode(Order, order, { alwaysEmitImplicit: true }), {
        orderId: "",
        field1: 0,
        label: "",
        color: "COLOR_UNSPECIFIED",
        level: "LEVEL_UNSPECIFIED",
        sizes: [],
        notes: {}
      })
    })

    it("writes a field with presence that holds zero", () => {
      assert.deepStrictEqual(encode(Order, { ...order, count: 0 }), { count: 0 })
    })

    it("reads null as an unset field, and leaves out an unset optional field", () => {
      assert.deepStrictEqual(decode(Order, { count: null, sizes: null, child: null }), order)
    })

    it("rejects null in a repeated field", () => {
      fails(() => decode(Order, { sizes: [1, null] }), /expected a value, not null\n  at \["sizes"\]\[1\]/)
    })
  })

  describe("enums", () => {
    it("writes names, the first of an alias, or numbers", () => {
      assert.deepStrictEqual(encode(Order, { ...order, color: "COLOR_CRIMSON", level: 7 }), {
        color: "COLOR_RED",
        level: 7
      })
      assert.deepStrictEqual(encode(Order, { ...order, color: "COLOR_RED" }, { enumAsInteger: true }), { color: 1 })
    })

    it("reads names, aliases, and numbers", () => {
      assert.deepStrictEqual(decode(Order, { color: "COLOR_CRIMSON", level: 7 }), {
        ...order,
        color: "COLOR_RED",
        level: 7
      })
      assert.deepStrictEqual(decode(Order, { color: 1 }), { ...order, color: "COLOR_RED" })
    })

    it("rejects unknown names, unless they are ignored, and unknown numbers of closed enums", () => {
      fails(() => decode(Order, { color: "COLOR_BLUE" }), /unknown enum value name\n  at \["color"\]/)
      assert.deepStrictEqual(decode(Order, { color: "COLOR_BLUE" }, { ignoreUnknownFields: true }), order)
      fails(() => decode(Order, { color: 5 }), /unknown value of a closed enum/)
    })
  })

  describe("oneofs", () => {
    it("writes the key of the case, even when it holds zero", () => {
      assert.deepStrictEqual(encode(Order, { ...order, pick: { _tag: "number", value: 0 } }), { number: 0 })
    })

    it("reads a case, and skips a case that is null", () => {
      const expected = { ...order, pick: { _tag: "text" as const, value: "x" } }
      assert.deepStrictEqual(decode(Order, { text: "x" }), expected)
      assert.deepStrictEqual(decode(Order, { number: null, text: "x" }), expected)
    })

    it("rejects two cases", () => {
      fails(() => decode(Order, { text: "x", number: 1 }), /more than one case of oneof pick/)
    })
  })

  describe("maps", () => {
    it("writes keys as strings", () => {
      assert.deepStrictEqual(encode(Order, { ...order, notes: { "1": "a", "-2": "b" } }), {
        notes: { "1": "a", "-2": "b" }
      })
    })

    it("reads keys in canonical form, and rejects a key set twice", () => {
      assert.deepStrictEqual(decode(Order, { notes: { "01": "a" } }), { ...order, notes: { "1": "a" } })
      fails(() => decode(Order, { notes: { "1": "a", "01": "b" } }), /map key is set twice/)
      fails(() => decode(Order, { notes: { "x": "a" } }), /expected a protobuf int32 map key/)
    })
  })

  describe("well-known types", () => {
    // message Times { google.protobuf.Timestamp at = 1; google.protobuf.Duration ttl = 2;
    //   google.protobuf.Timestamp exact = 3; google.protobuf.FieldMask mask = 4;
    //   google.protobuf.StringValue label = 5; google.protobuf.Struct meta = 6; google.protobuf.Empty none = 7; }
    const WellKnown = Protobuf.Message("test.v1.WellKnown", {
      at: Schema.optionalKey(Protobuf.Timestamp).pipe(f(1)),
      ttl: Schema.optionalKey(Protobuf.Duration).pipe(f(2)),
      exact: Schema.optionalKey(Protobuf.TimestampParts).pipe(f(3)),
      mask: Schema.optionalKey(Protobuf.FieldMask).pipe(f(4)),
      label: Schema.optionalKey(Protobuf.StringValue).pipe(f(5)),
      meta: Schema.optionalKey(Protobuf.Struct).pipe(f(6)),
      none: Schema.optionalKey(Protobuf.Empty).pipe(f(7))
    })

    const cases: ReadonlyArray<readonly [string, typeof WellKnown.Type, Record<string, unknown>]> = [
      ["a timestamp in RFC 3339", { at: DateTime.makeUnsafe("2026-01-02T03:04:05.006Z") }, {
        at: "2026-01-02T03:04:05.006Z"
      }],
      ["a whole-second timestamp without a fraction", { at: DateTime.makeUnsafe(0) }, { at: "1970-01-01T00:00:00Z" }],
      ["nanoseconds in 9 digits", { exact: { seconds: 0n, nanos: 1 } }, { exact: "1970-01-01T00:00:00.000000001Z" }],
      ["a duration in seconds", { ttl: Duration.millis(1500) }, { ttl: "1.500s" }],
      ["a negative duration under a second", { ttl: Duration.millis(-500) }, { ttl: "-0.500s" }],
      ["a field mask in lowerCamelCase", { mask: ["user.display_name", "id"] }, { mask: "user.displayName,id" }],
      ["a wrapper as its value", { label: "" }, { label: "" }],
      ["an empty message", { none: {} }, { none: {} }]
    ]
    for (const [name, value, json] of cases) {
      it(`writes ${name}`, () => {
        assert.deepStrictEqual(encode(WellKnown, value), json)
        assert.deepStrictEqual(decode(WellKnown, json), value)
      })
    }

    it("writes a struct as a JSON object", () => {
      const json = { a: 1, b: [true, null, "x"], c: { d: {} } }
      const meta = decode(Protobuf.Struct, json)
      assert.deepStrictEqual(encode(WellKnown, { meta }), { meta: json })
    })

    it("writes a null Value as null", () => {
      const value: Protobuf.Value = { kind: { _tag: "nullValue", value: "NULL_VALUE" } }
      assert.strictEqual(encode(Protobuf.Value, value), null)
      assert.deepStrictEqual(decode(Protobuf.Value, null), value)
      fails(() => decode(Protobuf.Struct, null), /expected a JSON object/)
    })

    it("reads timestamps with an offset, and rejects invalid ones", () => {
      assert.deepStrictEqual(decode(WellKnown, { exact: "1970-01-01T01:00:00.5+01:00" }), {
        exact: { seconds: 0n, nanos: 500_000_000 }
      })
      fails(() => decode(WellKnown, { at: "1970-01-01t00:00:00z" }), /expected an RFC 3339 timestamp/)
      fails(() => decode(WellKnown, { at: "2026-02-29T00:00:00Z" }), /expected an RFC 3339 timestamp/)
      fails(() => decode(WellKnown, { at: "0000-12-31T23:59:59Z" }), /timestamp out of range/)
    })

    it("rejects field mask paths without a JSON representation", () => {
      fails(() => encode(WellKnown, { mask: ["foo__bar"] }), /path has no JSON representation/)
      fails(() => decode(WellKnown, { mask: "foo_bar" }), /expected a path in lowerCamelCase/)
    })

    // Encoding trusts the JSON it writes, so the codec itself rejects values
    // without a JSON representation.
    it("rejects a value without a JSON representation", () => {
      const meta = decode(Protobuf.Struct, { a: 1 })
      const nan = { fields: { a: { kind: { _tag: "numberValue" as const, value: NaN } } } }
      fails(() => encode(WellKnown, { meta: { ...meta, ...nan } }), /expected a finite number/)
      class Text {
        readonly text = "a"
      }
      const text = { kind: { _tag: "stringValue", value: new Text() } } as unknown as Protobuf.Value
      fails(() => encode(Protobuf.Value, text), /expected a protobuf string/)
      const values: Array<Protobuf.Value> = []
      const cycle: Protobuf.Value = { kind: { _tag: "listValue", value: { values } } }
      values.push(cycle)
      fails(() => encode(Protobuf.Value, cycle), /nesting deeper than 100/)
    })
  })

  describe("Any", () => {
    const registry = Protobuf.registry(Order, Protobuf.DurationParts)

    it("writes the fields of a message next to @type", () => {
      const any = Protobuf.anyPack(Order, { ...order, orderId: "a" })
      assert.deepStrictEqual(encode(Protobuf.Any, any, { registry }), {
        "@type": "type.googleapis.com/test.v1.Order",
        orderId: "a"
      })
      assert.deepStrictEqual(
        decode(Protobuf.Any, { orderId: "a", "@type": "type.googleapis.com/test.v1.Order" }, {
          registry
        }),
        any
      )
    })

    it("writes a well-known type under value", () => {
      const any = Protobuf.anyPack(Protobuf.DurationParts, { seconds: 1n, nanos: 0 })
      const json = { "@type": "type.googleapis.com/google.protobuf.Duration", value: "1s" }
      assert.deepStrictEqual(encode(Protobuf.Any, any, { registry }), json)
      assert.deepStrictEqual(decode(Protobuf.Any, json, { registry }), any)
    })

    it("ignores unknown fields next to a well-known type, only when they are ignored", () => {
      const json = { "@type": "type.googleapis.com/google.protobuf.Duration", value: "1s", extra: 1 }
      fails(() => decode(Protobuf.Any, json, { registry }), /unknown field of google.protobuf.Any/)
      assert.deepStrictEqual(
        decode(Protobuf.Any, json, { registry, ignoreUnknownFields: true }),
        Protobuf.anyPack(Protobuf.DurationParts, { seconds: 1n, nanos: 0 })
      )
    })

    it("reads an empty object as an empty Any", () => {
      assert.deepStrictEqual(decode(Protobuf.Any, {}), { typeUrl: "", value: new Uint8Array(0) })
    })

    it("needs the message in the registry", () => {
      const any = Protobuf.anyPack(Order, order)
      fails(() => encode(Protobuf.Any, any), /holds type.googleapis.com\/test.v1.Order, which is not in the registry/)
    })
  })

  describe("extensions", () => {
    // message Product { string name = 1; extensions 100 to 199; }
    // extend Product { int32 priority = 100; }
    const Product = Protobuf.Message("test.v1.Product", { name: Schema.String.pipe(f(1)) })
    const priority = Protobuf.extension(Product, 100, Protobuf.Int32, { name: "test.v1.priority" })
    const registry = Protobuf.registry(Product, priority)

    it("writes and reads extensions of the registry under their full name", () => {
      const product = Protobuf.setExtension({ name: "lamp" }, priority, 3)
      const json = { name: "lamp", "[test.v1.priority]": 3 }
      assert.deepStrictEqual(encode(Product, product, { registry }), json)
      assert.deepStrictEqual(decode(Product, json, { registry }), product)
    })

    it("drops unknown fields, and extensions without a registry", () => {
      const product = Protobuf.setExtension({ name: "lamp" }, priority, 3)
      assert.deepStrictEqual(encode(Product, product), { name: "lamp" })
    })
  })

  it("rejects nesting deeper than 100 messages", () => {
    let json: Record<string, unknown> = {}
    for (let i = 0; i < 101; i++) json = { child: json }
    fails(() => decode(Order, json), /nesting deeper than 100/)
  })

  it("composes with Schema.fromJsonString", () => {
    const codec = Schema.fromJsonString(ProtobufJson.toCodec(Order))
    assert.strictEqual(Schema.encodeSync(codec)({ ...order, orderId: "a" }), `{"orderId":"a"}`)
    assert.deepStrictEqual(Schema.decodeSync(codec)(`{"order_id":"a"}`), { ...order, orderId: "a" })
  })
})
