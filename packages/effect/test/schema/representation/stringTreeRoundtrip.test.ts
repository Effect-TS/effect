import { assert, describe, it } from "@effect/vitest"
import { Schema, type SchemaRepresentation } from "effect"

function makeValueSchema<Type extends string, Value extends Schema.Top>(type: Type, value: Value) {
  return Schema.Struct({ type: Schema.tag(type), value })
}

const LiteralValueSchema: Schema.Codec<SchemaRepresentation.LiteralValue> = Schema.Union([
  makeValueSchema("string", Schema.String),
  makeValueSchema("number", Schema.Finite),
  makeValueSchema("bigint", Schema.BigInt),
  makeValueSchema("boolean", Schema.Boolean)
])

const EnumValueSchema: Schema.Codec<SchemaRepresentation.EnumValue> = Schema.Union([
  makeValueSchema("string", Schema.String),
  makeValueSchema("number", Schema.Number)
])

const PropertyNameSchema: Schema.Codec<SchemaRepresentation.PropertyName> = Schema.Union([
  makeValueSchema("string", Schema.String),
  makeValueSchema("number", Schema.Number),
  makeValueSchema("symbol", Schema.Symbol)
])

function assertRoundtrips<A>(
  schema: Schema.Codec<A>,
  cases: ReadonlyArray<readonly [value: A, encoded: Schema.StringTree]>
): void {
  const codec = Schema.toCodecStringTree(schema)
  const encode = Schema.encodeSync(codec)
  const decode = Schema.decodeSync(codec)
  for (const [value, encoded] of cases) {
    assert.deepStrictEqual(encode(value), encoded)
    assert.deepStrictEqual(decode(encoded), value)
  }
}

describe("SchemaRepresentation tagged values through StringTree", () => {
  it("preserves LiteralValue types", () => {
    assertRoundtrips(LiteralValueSchema, [
      [{ type: "string", value: "1" }, { type: "string", value: "1" }],
      [{ type: "number", value: 1 }, { type: "number", value: "1" }],
      [{ type: "bigint", value: 1n }, { type: "bigint", value: "1" }],
      [{ type: "string", value: "true" }, { type: "string", value: "true" }],
      [{ type: "boolean", value: true }, { type: "boolean", value: "true" }]
    ])
  })

  it("preserves EnumValue types", () => {
    assertRoundtrips(EnumValueSchema, [
      [{ type: "string", value: "NaN" }, { type: "string", value: "NaN" }],
      [{ type: "number", value: Number.NaN }, { type: "number", value: "NaN" }],
      [{ type: "string", value: "Infinity" }, { type: "string", value: "Infinity" }],
      [{ type: "number", value: Number.POSITIVE_INFINITY }, { type: "number", value: "Infinity" }]
    ])
  })

  it("preserves PropertyName types", () => {
    assertRoundtrips(PropertyNameSchema, [
      [{ type: "string", value: "1" }, { type: "string", value: "1" }],
      [{ type: "number", value: 1 }, { type: "number", value: "1" }],
      [{ type: "string", value: "Symbol(key)" }, { type: "string", value: "Symbol(key)" }],
      [{ type: "symbol", value: Symbol.for("key") }, { type: "symbol", value: "Symbol(key)" }]
    ])
  })
})
