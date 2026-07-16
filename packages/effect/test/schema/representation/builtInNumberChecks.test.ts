import { assert, describe, it } from "@effect/vitest"
import { Formatter, Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface NumberCheckCase {
  readonly name: string
  readonly id: string
  readonly payload: Schema.Json
  readonly make: () => SchemaAST.Filter<number>
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly valid: number
  readonly invalid: number
  readonly jsonSchema: object
}

const cases: ReadonlyArray<NumberCheckCase> = [
  {
    name: "isFinite",
    id: "effect/schema/isFinite",
    payload: null,
    make: () => Schema.isFinite(),
    reviver: Schema.isFiniteReviver,
    runtime: "Schema.isFinite()",
    valid: 1,
    invalid: Infinity,
    jsonSchema: { type: "number" }
  },
  {
    name: "isInt",
    id: "effect/schema/isInt",
    payload: null,
    make: () => Schema.isInt(),
    reviver: Schema.isIntReviver,
    runtime: "Schema.isInt()",
    valid: 1,
    invalid: 1.5,
    jsonSchema: { type: "integer" }
  },
  {
    name: "isMultipleOf",
    id: "effect/schema/isMultipleOf",
    payload: { divisor: 3 },
    make: () => Schema.isMultipleOf(3),
    reviver: Schema.isMultipleOfReviver,
    runtime: "Schema.isMultipleOf(3)",
    valid: 6,
    invalid: 7,
    jsonSchema: { multipleOf: 3 }
  },
  {
    name: "isGreaterThan",
    id: "effect/schema/isGreaterThan",
    payload: { exclusiveMinimum: 1 },
    make: () => Schema.isGreaterThan(1),
    reviver: Schema.isGreaterThanReviver,
    runtime: "Schema.isGreaterThan(1)",
    valid: 2,
    invalid: 1,
    jsonSchema: { exclusiveMinimum: 1 }
  },
  {
    name: "isGreaterThanOrEqualTo",
    id: "effect/schema/isGreaterThanOrEqualTo",
    payload: { minimum: 1 },
    make: () => Schema.isGreaterThanOrEqualTo(1),
    reviver: Schema.isGreaterThanOrEqualToReviver,
    runtime: "Schema.isGreaterThanOrEqualTo(1)",
    valid: 1,
    invalid: 0,
    jsonSchema: { minimum: 1 }
  },
  {
    name: "isLessThan",
    id: "effect/schema/isLessThan",
    payload: { exclusiveMaximum: 2 },
    make: () => Schema.isLessThan(2),
    reviver: Schema.isLessThanReviver,
    runtime: "Schema.isLessThan(2)",
    valid: 1,
    invalid: 2,
    jsonSchema: { exclusiveMaximum: 2 }
  },
  {
    name: "isLessThanOrEqualTo",
    id: "effect/schema/isLessThanOrEqualTo",
    payload: { maximum: 2 },
    make: () => Schema.isLessThanOrEqualTo(2),
    reviver: Schema.isLessThanOrEqualToReviver,
    runtime: "Schema.isLessThanOrEqualTo(2)",
    valid: 2,
    invalid: 3,
    jsonSchema: { maximum: 2 }
  },
  {
    name: "isBetween",
    id: "effect/schema/isBetween",
    payload: { minimum: 1, maximum: 3, exclusiveMinimum: true },
    make: () => Schema.isBetween({ minimum: 1, maximum: 3, exclusiveMinimum: true }),
    reviver: Schema.isBetweenReviver,
    runtime: "Schema.isBetween({ minimum: 1, maximum: 3, exclusiveMinimum: true, exclusiveMaximum: undefined })",
    valid: 2,
    invalid: 1,
    jsonSchema: { exclusiveMinimum: 1, maximum: 3 }
  }
]

const encodedNumberJsonSchema = {
  anyOf: [
    { type: "number" },
    { type: "string", enum: ["NaN"] },
    { type: "string", enum: ["Infinity"] },
    { type: "string", enum: ["-Infinity"] }
  ]
}

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

function expectInvalidPayload(
  json: Schema.Json,
  reviver: SchemaRepresentation.AnyReviver
): void {
  const path = Formatter.formatPath([
    "representation",
    "checks",
    0,
    "annotations",
    "representation",
    "payload"
  ])
  throws(
    () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [reviver] }),
    `Invalid representation payload for ${reviver.id}\n  at ${path}`
  )
}

describe("SchemaRepresentation built-in number checks", () => {
  it("emits the representation protocol and target callbacks", () => {
    for (const entry of cases) {
      const check = entry.make()
      assert.deepStrictEqual(check.annotations?.representation, {
        id: entry.id,
        payload: entry.payload
      })
      assert.deepStrictEqual(
        check.annotations?.toJsonSchema?.({ type: undefined, schemas: [] }),
        entry.jsonSchema
      )
      assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
        runtime: entry.runtime
      })
    }
  })

  it("revives every check without a global registry", () => {
    const asts = cases.map((entry, index) =>
      Schema.Number.annotate(index === 0 ? { description: "first" } : {}).check(entry.make()).ast
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

  it("compiles every callback through JSON Schema and codegen", () => {
    const document = SchemaRepresentation.fromASTs(
      cases.map((entry) => Schema.Number.check(entry.make()).ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    for (let index = 0; index < cases.length; index++) {
      assert.deepStrictEqual(
        jsonSchema.schemas[index],
        index < 2
          ? cases[index].jsonSchema
          : { ...encodedNumberJsonSchema, allOf: [cases[index].jsonSchema] }
      )
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
    }
  })

  it("normalizes between flags to the minimal persisted options", () => {
    const check = Schema.isBetween({
      minimum: 1,
      maximum: 3,
      exclusiveMinimum: false,
      exclusiveMaximum: true
    })
    assert.deepStrictEqual(check.annotations?.representation, {
      id: "effect/schema/isBetween",
      payload: { minimum: 1, maximum: 3, exclusiveMaximum: true }
    })
    assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
      runtime: "Schema.isBetween({ minimum: 1, maximum: 3, exclusiveMinimum: undefined, exclusiveMaximum: true })"
    })
  })

  it("rejects non-canonical numeric payloads", () => {
    const divisor = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Number.check(Schema.isMultipleOf(2)).ast)
    ) as any
    divisor.representation.checks[0].annotations.representation.payload.divisor = "2"
    expectInvalidPayload(divisor, Schema.isMultipleOfReviver)

    const between = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Number.check(Schema.isBetween({ minimum: 1, maximum: 3 })).ast)
    ) as any
    between.representation.checks[0].annotations.representation.payload.exclusiveMinimum = false
    expectInvalidPayload(between, Schema.isBetweenReviver)
  })

  it("keeps non-finite runtime bounds live but rejects their persisted payload", () => {
    const check = Schema.isGreaterThan(Infinity)
    assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
      runtime: "Schema.isGreaterThan(Infinity)"
    })
    throws(
      () => SchemaRepresentation.toJson(SchemaRepresentation.fromAST(Schema.Number.check(check).ast)),
      `Expected JSON value, got {"exclusiveMinimum":Infinity}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
    )
  })
})
