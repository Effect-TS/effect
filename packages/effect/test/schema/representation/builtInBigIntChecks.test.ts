import { assert, describe, it } from "@effect/vitest"
import { Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface BigIntCheckCase {
  readonly name: string
  readonly id: string
  readonly payload: Schema.Json
  readonly make: () => SchemaAST.Filter<bigint>
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly valid: bigint
  readonly invalid: bigint
}

const cases: ReadonlyArray<BigIntCheckCase> = [
  {
    name: "isGreaterThanBigInt",
    id: "effect/schema/isGreaterThanBigInt",
    payload: { exclusiveMinimum: "10" },
    make: () => Schema.isGreaterThanBigInt(10n),
    reviver: Schema.isGreaterThanBigIntReviver,
    runtime: "Schema.isGreaterThanBigInt(10n)",
    valid: 11n,
    invalid: 10n
  },
  {
    name: "isGreaterThanOrEqualToBigInt",
    id: "effect/schema/isGreaterThanOrEqualToBigInt",
    payload: { minimum: "10" },
    make: () => Schema.isGreaterThanOrEqualToBigInt(10n),
    reviver: Schema.isGreaterThanOrEqualToBigIntReviver,
    runtime: "Schema.isGreaterThanOrEqualToBigInt(10n)",
    valid: 10n,
    invalid: 9n
  },
  {
    name: "isLessThanBigInt",
    id: "effect/schema/isLessThanBigInt",
    payload: { exclusiveMaximum: "10" },
    make: () => Schema.isLessThanBigInt(10n),
    reviver: Schema.isLessThanBigIntReviver,
    runtime: "Schema.isLessThanBigInt(10n)",
    valid: 9n,
    invalid: 10n
  },
  {
    name: "isLessThanOrEqualToBigInt",
    id: "effect/schema/isLessThanOrEqualToBigInt",
    payload: { maximum: "10" },
    make: () => Schema.isLessThanOrEqualToBigInt(10n),
    reviver: Schema.isLessThanOrEqualToBigIntReviver,
    runtime: "Schema.isLessThanOrEqualToBigInt(10n)",
    valid: 10n,
    invalid: 11n
  },
  {
    name: "isBetweenBigInt",
    id: "effect/schema/isBetweenBigInt",
    payload: { minimum: "-10", maximum: "10", exclusiveMaximum: true },
    make: () => Schema.isBetweenBigInt({ minimum: -10n, maximum: 10n, exclusiveMaximum: true }),
    reviver: Schema.isBetweenBigIntReviver,
    runtime:
      "Schema.isBetweenBigInt({ minimum: -10n, maximum: 10n, exclusiveMinimum: undefined, exclusiveMaximum: true })",
    valid: 0n,
    invalid: 10n
  }
]

const encodedBigIntJsonSchema = {
  type: "string",
  allOf: [{ pattern: "^-?\\d+$" }]
}

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

function expectInvalidPayload(json: Schema.Json, reviver: SchemaRepresentation.AnyReviver): void {
  throws(
    () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [reviver] }),
    `Invalid representation payload for ${reviver.id}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
  )
}

describe("SchemaRepresentation built-in BigInt checks", () => {
  it("emits canonical decimal payloads and target callbacks", () => {
    for (const entry of cases) {
      const check = entry.make()
      assert.deepStrictEqual(check.annotations?.representation, {
        id: entry.id,
        payload: entry.payload
      })
      assert.deepStrictEqual(check.annotations?.toJsonSchema?.({ type: "string", schemas: [] }), {})
      assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
        runtime: entry.runtime
      })
    }
  })

  it("revives every check without a global registry", () => {
    const asts = cases.map((entry, index) =>
      Schema.BigInt.annotate(index === 0 ? { description: "first" } : {}).check(entry.make()).ast
    ) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    const json = SchemaRepresentation.toJsonMultiDocument(SchemaRepresentation.fromASTs(asts))
    const revived = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: cases.map((entry) => entry.reviver)
    })

    assert.strictEqual(revived.schemas.length, cases.length)
    for (let index = 0; index < cases.length; index++) {
      const entry = cases[index]
      const schema = noServices(revived.schemas[index])
      assert.isTrue(Schema.decodeUnknownResult(schema)(entry.valid)._tag === "Success")
      assert.isTrue(Schema.decodeUnknownResult(schema)(entry.invalid)._tag === "Failure")
      assert.strictEqual(schema.ast.checks?.[0].annotations?.representation?.id, entry.id)
      assert.isTrue(typeof schema.ast.checks?.[0].annotations?.toJsonSchema === "function")
      assert.isTrue(typeof schema.ast.checks?.[0].annotations?.toCode === "function")
    }
    assert.strictEqual(revived.schemas[0].ast.annotations?.description, "first")

    const lowered = SchemaRepresentation.fromASTs(
      revived.schemas.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    assert.deepStrictEqual(SchemaRepresentation.toJsonMultiDocument(lowered), json)
  })

  it("keeps JSON Schema structural and compiles BigInt literals", () => {
    const document = SchemaRepresentation.fromASTs(
      cases.map((entry) => Schema.BigInt.check(entry.make()).ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    for (let index = 0; index < cases.length; index++) {
      assert.deepStrictEqual(jsonSchema.schemas[index], encodedBigIntJsonSchema)
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
    }
  })

  it("normalizes large bounds and between flags", () => {
    const large = 900719925474099312345678901234567890n
    assert.deepStrictEqual(Schema.isGreaterThanBigInt(large).annotations?.representation, {
      id: "effect/schema/isGreaterThanBigInt",
      payload: { exclusiveMinimum: "900719925474099312345678901234567890" }
    })

    const between = Schema.isBetweenBigInt({
      minimum: -1n,
      maximum: 1n,
      exclusiveMinimum: false,
      exclusiveMaximum: true
    })
    assert.deepStrictEqual(between.annotations?.representation, {
      id: "effect/schema/isBetweenBigInt",
      payload: { minimum: "-1", maximum: "1", exclusiveMaximum: true }
    })
    assert.deepStrictEqual(between.annotations?.toCode?.({ schemas: [] }), {
      runtime:
        "Schema.isBetweenBigInt({ minimum: -1n, maximum: 1n, exclusiveMinimum: undefined, exclusiveMaximum: true })"
    })
  })

  it("rejects non-canonical decimal strings", () => {
    const original = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.BigInt.check(Schema.isGreaterThanBigInt(1n)).ast)
    )
    for (const value of ["+1", "01", "-0", "1.0", " 1"]) {
      const json = JSON.parse(JSON.stringify(original))
      json.representation.checks[0].annotations.representation.payload.exclusiveMinimum = value
      expectInvalidPayload(json, Schema.isGreaterThanBigIntReviver)
    }
  })
})
