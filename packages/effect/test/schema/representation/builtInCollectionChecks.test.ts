import { assert, describe, it } from "@effect/vitest"
import { type JsonSchema, Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface CollectionCheckCase {
  readonly name: string
  readonly id: string
  readonly payload: Schema.Json
  readonly make: () => SchemaAST.Filter<any>
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly valid: unknown
  readonly invalid: unknown
  readonly jsonSchema: JsonSchema.JsonSchema
}

const cases: ReadonlyArray<CollectionCheckCase> = [
  {
    name: "isMinSize",
    id: "effect/schema/isMinSize",
    payload: { minSize: 2 },
    make: () => Schema.isMinSize(2),
    reviver: Schema.isMinSizeReviver,
    runtime: "Schema.isMinSize(2)",
    valid: new Set([1, 2]),
    invalid: new Set([1]),
    jsonSchema: {}
  },
  {
    name: "isMaxSize",
    id: "effect/schema/isMaxSize",
    payload: { maxSize: 1 },
    make: () => Schema.isMaxSize(1),
    reviver: Schema.isMaxSizeReviver,
    runtime: "Schema.isMaxSize(1)",
    valid: new Set([1]),
    invalid: new Set([1, 2]),
    jsonSchema: {}
  },
  {
    name: "isSizeBetween",
    id: "effect/schema/isSizeBetween",
    payload: { minimum: 1, maximum: 2 },
    make: () => Schema.isSizeBetween(1, 2),
    reviver: Schema.isSizeBetweenReviver,
    runtime: "Schema.isSizeBetween(1, 2)",
    valid: new Set([1]),
    invalid: new Set<number>(),
    jsonSchema: {}
  },
  {
    name: "isUnique",
    id: "effect/schema/isUnique",
    payload: null,
    make: () => Schema.isUnique(),
    reviver: Schema.isUniqueReviver,
    runtime: "Schema.isUnique()",
    valid: [1, 2],
    invalid: [1, 1],
    jsonSchema: { uniqueItems: true }
  }
]

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

function expectInvalidPayload(json: Schema.Json, reviver: SchemaRepresentation.AnyReviver): void {
  throws(
    () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [reviver] }),
    `Invalid representation payload for ${reviver.id}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
  )
}

describe("SchemaRepresentation built-in collection checks", () => {
  it("emits the representation protocol", () => {
    for (const entry of cases) {
      const check = entry.make()
      assert.deepStrictEqual(check.annotations?.representation, {
        id: entry.id,
        payload: entry.payload
      })
      assert.deepStrictEqual(check.annotations?.toJsonSchema?.({ type: undefined, schemas: [] }), entry.jsonSchema)
      assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
        runtime: entry.runtime
      })
    }
  })

  it("revives every check without a global registry", () => {
    const asts = cases.map((entry, index) =>
      Schema.Any.annotate(index === 0 ? { description: "first" } : {}).check(entry.make()).ast
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
      cases.map((entry) => Schema.Any.check(entry.make()).ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    assert.deepStrictEqual(jsonSchema.schemas, [{}, {}, {}, { uniqueItems: true }])
    for (let index = 0; index < cases.length; index++) {
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
    }
  })

  it("normalizes size bounds before persisting and generating code", () => {
    assert.deepStrictEqual(Schema.isMinSize(-1).annotations?.representation, {
      id: "effect/schema/isMinSize",
      payload: { minSize: 0 }
    })
    assert.deepStrictEqual(Schema.isMaxSize(2.9).annotations?.representation, {
      id: "effect/schema/isMaxSize",
      payload: { maxSize: 2 }
    })
    const between = Schema.isSizeBetween(1.9, 3.7)
    assert.deepStrictEqual(between.annotations?.representation, {
      id: "effect/schema/isSizeBetween",
      payload: { minimum: 1, maximum: 3 }
    })
    assert.deepStrictEqual(between.annotations?.toCode?.({ schemas: [] }), {
      runtime: "Schema.isSizeBetween(1, 3)"
    })
  })

  it("rejects non-canonical size and isUnique payloads", () => {
    const sizeJson = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Any.check(Schema.isMinSize(1)).ast)
    ) as any
    sizeJson.representation.checks[0].annotations.representation.payload.minSize = 1.5
    expectInvalidPayload(sizeJson, Schema.isMinSizeReviver)

    const uniqueJson = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.Any.check(Schema.isUnique()).ast)
    ) as any
    uniqueJson.representation.checks[0].annotations.representation.payload = {}
    expectInvalidPayload(uniqueJson, Schema.isUniqueReviver)
  })
})
