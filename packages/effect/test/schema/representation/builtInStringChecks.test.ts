import { assert, describe, it } from "@effect/vitest"
import { Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface StringCheckCase {
  readonly name: string
  readonly id: string
  readonly payload: Schema.Json
  readonly make: () => SchemaAST.Filter<any>
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly valid: unknown
  readonly invalid: unknown
  readonly jsonSchema: (check: SchemaAST.Filter<any>) => object
  readonly arrayJsonSchema?: object | undefined
}

function patternJsonSchema(check: SchemaAST.Filter<any>): object {
  const arbitrary = check.annotations?.arbitrary as {
    readonly constraint: { readonly patterns: ReadonlyArray<string> }
  }
  return { pattern: arbitrary.constraint.patterns[0] }
}

const cases: ReadonlyArray<StringCheckCase> = [
  {
    name: "isStringFinite",
    id: "effect/schema/isStringFinite",
    payload: null,
    make: () => Schema.isStringFinite(),
    reviver: Schema.isStringFiniteReviver,
    runtime: "Schema.isStringFinite()",
    valid: "1.5",
    invalid: "Infinity",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isStringBigInt",
    id: "effect/schema/isStringBigInt",
    payload: null,
    make: () => Schema.isStringBigInt(),
    reviver: Schema.isStringBigIntReviver,
    runtime: "Schema.isStringBigInt()",
    valid: "-10",
    invalid: "1.5",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isStringSymbol",
    id: "effect/schema/isStringSymbol",
    payload: null,
    make: () => Schema.isStringSymbol(),
    reviver: Schema.isStringSymbolReviver,
    runtime: "Schema.isStringSymbol()",
    valid: "Symbol(shared)",
    invalid: "shared",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isMinLength",
    id: "effect/schema/isMinLength",
    payload: { minLength: 1 },
    make: () => Schema.isMinLength(1.8),
    reviver: Schema.isMinLengthReviver,
    runtime: "Schema.isMinLength(1)",
    valid: "a",
    invalid: "",
    jsonSchema: () => ({ minLength: 1 }),
    arrayJsonSchema: { minItems: 1 }
  },
  {
    name: "isMaxLength",
    id: "effect/schema/isMaxLength",
    payload: { maxLength: 3 },
    make: () => Schema.isMaxLength(3.8),
    reviver: Schema.isMaxLengthReviver,
    runtime: "Schema.isMaxLength(3)",
    valid: "abc",
    invalid: "abcd",
    jsonSchema: () => ({ maxLength: 3 }),
    arrayJsonSchema: { maxItems: 3 }
  },
  {
    name: "isLengthBetween",
    id: "effect/schema/isLengthBetween",
    payload: { minimum: 1, maximum: 3 },
    make: () => Schema.isLengthBetween(1.8, 3.8),
    reviver: Schema.isLengthBetweenReviver,
    runtime: "Schema.isLengthBetween(1, 3)",
    valid: "ab",
    invalid: "",
    jsonSchema: () => ({ allOf: [{ minLength: 1 }, { maxLength: 3 }] }),
    arrayJsonSchema: { allOf: [{ minItems: 1 }, { maxItems: 3 }] }
  },
  {
    name: "isPattern",
    id: "effect/schema/isPattern",
    payload: { source: "^a+$", flags: "i" },
    make: () => Schema.isPattern(/^a+$/i),
    reviver: Schema.isPatternReviver,
    runtime: `Schema.isPattern(new RegExp("^a+$", "i"))`,
    valid: "AAA",
    invalid: "bbb",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isTrimmed",
    id: "effect/schema/isTrimmed",
    payload: null,
    make: () => Schema.isTrimmed(),
    reviver: Schema.isTrimmedReviver,
    runtime: "Schema.isTrimmed()",
    valid: "text",
    invalid: " text ",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isUUID",
    id: "effect/schema/isUUID",
    payload: { version: 4 },
    make: () => Schema.isUUID(4),
    reviver: Schema.isUUIDReviver,
    runtime: "Schema.isUUID(4)",
    valid: "123e4567-e89b-42d3-a456-426614174000",
    invalid: "123e4567-e89b-12d3-a456-426614174000",
    jsonSchema: (check) => ({ ...patternJsonSchema(check), format: "uuid" })
  },
  {
    name: "isGUID",
    id: "effect/schema/isGUID",
    payload: null,
    make: () => Schema.isGUID(),
    reviver: Schema.isGUIDReviver,
    runtime: "Schema.isGUID()",
    valid: "123e4567-e89b-12d3-a456-426614174000",
    invalid: "not-a-guid",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isULID",
    id: "effect/schema/isULID",
    payload: null,
    make: () => Schema.isULID(),
    reviver: Schema.isULIDReviver,
    runtime: "Schema.isULID()",
    valid: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    invalid: "not-a-ulid",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isBase64",
    id: "effect/schema/isBase64",
    payload: null,
    make: () => Schema.isBase64(),
    reviver: Schema.isBase64Reviver,
    runtime: "Schema.isBase64()",
    valid: "YQ==",
    invalid: "?",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isBase64Url",
    id: "effect/schema/isBase64Url",
    payload: null,
    make: () => Schema.isBase64Url(),
    reviver: Schema.isBase64UrlReviver,
    runtime: "Schema.isBase64Url()",
    valid: "YQ",
    invalid: "?",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isStartsWith",
    id: "effect/schema/isStartsWith",
    payload: { startsWith: "pre" },
    make: () => Schema.isStartsWith("pre"),
    reviver: Schema.isStartsWithReviver,
    runtime: `Schema.isStartsWith("pre")`,
    valid: "prefix",
    invalid: "suffix",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isEndsWith",
    id: "effect/schema/isEndsWith",
    payload: { endsWith: "end" },
    make: () => Schema.isEndsWith("end"),
    reviver: Schema.isEndsWithReviver,
    runtime: `Schema.isEndsWith("end")`,
    valid: "weekend",
    invalid: "ending",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isIncludes",
    id: "effect/schema/isIncludes",
    payload: { includes: "mid" },
    make: () => Schema.isIncludes("mid"),
    reviver: Schema.isIncludesReviver,
    runtime: `Schema.isIncludes("mid")`,
    valid: "middle",
    invalid: "outside",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isUppercased",
    id: "effect/schema/isUppercased",
    payload: null,
    make: () => Schema.isUppercased(),
    reviver: Schema.isUppercasedReviver,
    runtime: "Schema.isUppercased()",
    valid: "ABC1",
    invalid: "Abc",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isLowercased",
    id: "effect/schema/isLowercased",
    payload: null,
    make: () => Schema.isLowercased(),
    reviver: Schema.isLowercasedReviver,
    runtime: "Schema.isLowercased()",
    valid: "abc1",
    invalid: "Abc",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isCapitalized",
    id: "effect/schema/isCapitalized",
    payload: null,
    make: () => Schema.isCapitalized(),
    reviver: Schema.isCapitalizedReviver,
    runtime: "Schema.isCapitalized()",
    valid: "Hello",
    invalid: "hello",
    jsonSchema: patternJsonSchema
  },
  {
    name: "isUncapitalized",
    id: "effect/schema/isUncapitalized",
    payload: null,
    make: () => Schema.isUncapitalized(),
    reviver: Schema.isUncapitalizedReviver,
    runtime: "Schema.isUncapitalized()",
    valid: "hello",
    invalid: "Hello",
    jsonSchema: patternJsonSchema
  }
]

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

describe("SchemaRepresentation built-in string checks", () => {
  it("emits the representation protocol from the normalized constructor arguments", () => {
    for (const entry of cases) {
      const check = entry.make()
      assert.deepStrictEqual(check.annotations?.representation, {
        id: entry.id,
        payload: entry.payload
      })
      assert.deepStrictEqual(
        check.annotations?.toJsonSchema?.({ type: "string", schemas: [] }),
        entry.jsonSchema(check)
      )
      if (entry.arrayJsonSchema !== undefined) {
        assert.deepStrictEqual(
          check.annotations?.toJsonSchema?.({ type: "array", schemas: [] }),
          entry.arrayJsonSchema
        )
      }
      assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
        runtime: entry.runtime
      })
    }
  })

  it("revives every check without a global registry", () => {
    const asts = cases.map((entry, index) =>
      Schema.String.annotate(index === 0 ? { description: "first" } : {}).check(entry.make()).ast
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

  it("compiles every revived callback through JSON Schema and codegen", () => {
    const document = SchemaRepresentation.fromASTs(
      cases.map((entry) => Schema.String.check(entry.make()).ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    for (let index = 0; index < cases.length; index++) {
      const fragment = cases[index].jsonSchema(cases[index].make()) as { readonly allOf?: unknown }
      assert.deepStrictEqual(jsonSchema.schemas[index], {
        type: "string",
        allOf: Array.isArray(fragment.allOf) && Object.keys(fragment).length === 1
          ? fragment.allOf
          : [fragment]
      })
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
    }
  })

  it("uses a canonical null UUID version", () => {
    const check = Schema.isUUID()
    assert.deepStrictEqual(check.annotations?.representation, {
      id: "effect/schema/isUUID",
      payload: { version: null }
    })
    assert.deepStrictEqual(check.annotations?.toCode?.({ schemas: [] }), {
      runtime: "Schema.isUUID()"
    })
  })

  it("rejects non-canonical parameter payloads", () => {
    const invalid: ReadonlyArray<{
      readonly check: SchemaAST.Filter<any>
      readonly reviver: SchemaRepresentation.AnyReviver
      readonly update: (payload: Record<string, unknown>) => void
    }> = [
      {
        check: Schema.isMinLength(1),
        reviver: Schema.isMinLengthReviver,
        update: (payload) => {
          payload.minLength = 1.5
        }
      },
      {
        check: Schema.isMaxLength(1),
        reviver: Schema.isMaxLengthReviver,
        update: (payload) => {
          payload.maxLength = -1
        }
      },
      {
        check: Schema.isUUID(4),
        reviver: Schema.isUUIDReviver,
        update: (payload) => {
          payload.version = 9
        }
      },
      {
        check: Schema.isStartsWith("a"),
        reviver: Schema.isStartsWithReviver,
        update: (payload) => {
          payload.startsWith = 1
        }
      }
    ]

    for (const entry of invalid) {
      const json = SchemaRepresentation.toJson(
        SchemaRepresentation.fromAST(Schema.String.check(entry.check).ast)
      ) as any
      entry.update(json.representation.checks[0].annotations.representation.payload)
      throws(
        () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [entry.reviver] }),
        `Invalid representation payload for ${entry.reviver.id}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
      )
    }
  })
})
