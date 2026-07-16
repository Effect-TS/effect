import { assert, describe, it } from "@effect/vitest"
import { type JsonSchema, Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface ObjectCheckCase {
  readonly name: string
  readonly id: string
  readonly payload: Schema.Json
  readonly make: () => SchemaAST.Filter<object>
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly valid: object
  readonly invalid: object
  readonly jsonSchema: JsonSchema.JsonSchema
}

const cases: ReadonlyArray<ObjectCheckCase> = [
  {
    name: "isMinProperties",
    id: "effect/schema/isMinProperties",
    payload: { minProperties: 2 },
    make: () => Schema.isMinProperties(2),
    reviver: Schema.isMinPropertiesReviver,
    runtime: "Schema.isMinProperties(2)",
    valid: { a: 1, b: 2 },
    invalid: { a: 1 },
    jsonSchema: { minProperties: 2 }
  },
  {
    name: "isMaxProperties",
    id: "effect/schema/isMaxProperties",
    payload: { maxProperties: 1 },
    make: () => Schema.isMaxProperties(1),
    reviver: Schema.isMaxPropertiesReviver,
    runtime: "Schema.isMaxProperties(1)",
    valid: { a: 1 },
    invalid: { a: 1, b: 2 },
    jsonSchema: { maxProperties: 1 }
  },
  {
    name: "isPropertiesLengthBetween",
    id: "effect/schema/isPropertiesLengthBetween",
    payload: { minimum: 1, maximum: 2 },
    make: () => Schema.isPropertiesLengthBetween(1, 2),
    reviver: Schema.isPropertiesLengthBetweenReviver,
    runtime: "Schema.isPropertiesLengthBetween(1, 2)",
    valid: { a: 1 },
    invalid: {},
    jsonSchema: { minProperties: 1, maxProperties: 2 }
  }
]

const propertyNamesSchema = Schema.String.check(Schema.isPattern(/^[A-Z]/))

function propertyNamesCheck(): SchemaAST.Filter<object> {
  return Schema.isPropertyNames(propertyNamesSchema)
}

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

describe("SchemaRepresentation built-in object checks", () => {
  it("emits the representation protocol for property-count checks", () => {
    for (const entry of cases) {
      const check = entry.make()
      assert.deepStrictEqual(check.annotations?.representation, {
        id: entry.id,
        payload: entry.payload
      })
      assert.deepStrictEqual(check.annotations?.toJsonSchema?.({ type: "object", schemas: [] }), entry.jsonSchema)
      assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
        runtime: entry.runtime
      })
    }
  })

  it("emits the encoded key schema as an isPropertyNames dependency", () => {
    const check = propertyNamesCheck()
    assert.deepStrictEqual(check.annotations?.representation, {
      id: "effect/schema/isPropertyNames",
      payload: null,
      schemas: [propertyNamesSchema.ast]
    })
    assert.deepStrictEqual(
      check.annotations?.toJsonSchema?.({ type: "object", schemas: [{ type: "string" }] }),
      { propertyNames: { type: "string" } }
    )
    assert.deepStrictEqual(
      check.annotations?.toCode?.({ schemas: [{ runtime: "Schema.String", Type: "string" }] }),
      { runtime: "Schema.isPropertyNames(Schema.String)" }
    )
  })

  it("revives every check and its schema dependency without a global registry", () => {
    const entries = [
      ...cases,
      {
        name: "isPropertyNames",
        id: "effect/schema/isPropertyNames",
        payload: null,
        make: propertyNamesCheck,
        reviver: Schema.isPropertyNamesReviver,
        runtime: "Schema.isPropertyNames(Schema.String.check(Schema.isPattern(new RegExp(\"^[A-Z]\"))))",
        valid: { Alpha: 1 },
        invalid: { alpha: 1 },
        jsonSchema: { propertyNames: { type: "string", allOf: [{ pattern: "^[A-Z]" }] } }
      }
    ] satisfies ReadonlyArray<ObjectCheckCase>
    const asts = entries.map((entry, index) =>
      Schema.Any.annotate(index === 0 ? { description: "first" } : {}).check(entry.make()).ast
    ) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    const json = SchemaRepresentation.toJsonMultiDocument(SchemaRepresentation.fromASTs(asts))
    const revived = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: [...entries.map((entry) => entry.reviver), Schema.isPatternReviver]
    })

    assert.strictEqual(revived.schemas.length, entries.length)
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]
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

  it("compiles property-count callbacks and the propertyNames dependency", () => {
    const checks = [...cases.map((entry) => entry.make()), propertyNamesCheck()]
    const document = SchemaRepresentation.fromASTs(
      checks.map((check) => Schema.Any.check(check).ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    assert.deepStrictEqual(jsonSchema.schemas, [
      cases[0].jsonSchema,
      cases[1].jsonSchema,
      cases[2].jsonSchema,
      { propertyNames: { type: "string", allOf: [{ pattern: "^[A-Z]" }] } }
    ])
    for (let index = 0; index < cases.length; index++) {
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
    }
    assert.isTrue(code.codes[3].runtime.includes("Schema.isPropertyNames(Schema.String.check("))
    assert.isTrue(code.codes[3].runtime.includes("Schema.isPattern(new RegExp(\"^[A-Z]\"))"))
  })

  it("normalizes property counts before persisting and generating code", () => {
    assert.deepStrictEqual(Schema.isMinProperties(-1).annotations?.representation, {
      id: "effect/schema/isMinProperties",
      payload: { minProperties: 0 }
    })
    assert.deepStrictEqual(Schema.isMaxProperties(2.9).annotations?.representation, {
      id: "effect/schema/isMaxProperties",
      payload: { maxProperties: 2 }
    })
    const between = Schema.isPropertiesLengthBetween(1.9, 3.7)
    assert.deepStrictEqual(between.annotations?.representation, {
      id: "effect/schema/isPropertiesLengthBetween",
      payload: { minimum: 1, maximum: 3 }
    })
    assert.deepStrictEqual(between.annotations?.toCode?.({ schemas: [] }), {
      runtime: "Schema.isPropertiesLengthBetween(1, 3)"
    })
  })

  it("rejects non-canonical count payloads and missing propertyNames dependencies", () => {
    const countJson = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Any.check(Schema.isMinProperties(1)).ast)
    ) as any
    countJson.representation.checks[0].annotations.representation.payload.minProperties = 1.5
    throws(
      () =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(countJson), {
          revivers: [Schema.isMinPropertiesReviver]
        }),
      `Invalid representation payload for ${Schema.isMinPropertiesReviver.id}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
    )

    const propertyNamesJson = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Any.check(propertyNamesCheck()).ast)
    ) as any
    delete propertyNamesJson.representation.checks[0].annotations.representation.schemas
    throws(
      () =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(propertyNamesJson), {
          revivers: [Schema.isPropertyNamesReviver]
        }),
      `Invalid schemas arity for ${Schema.isPropertyNamesReviver.id}: expected ${Schema.isPropertyNamesReviver.schemasArity}, got 0\n  at ["representation"]["checks"][0]["annotations"]["representation"]["schemas"]`
    )
  })
})
