import { assert, describe, it } from "@effect/vitest"
import { type JsonSchema, Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

interface AtomicDeclarationCase {
  readonly name: string
  readonly id: string
  readonly schema: Schema.Top
  readonly reviver: SchemaRepresentation.AnyReviver
  readonly runtime: string
  readonly Type: string
  readonly valid: unknown
  readonly invalid: unknown
  readonly jsonSchema: JsonSchema.JsonSchema
}

const numberJsonSchema: JsonSchema.JsonSchema = {
  anyOf: [
    { type: "number" },
    { type: "string", enum: ["NaN"] },
    { type: "string", enum: ["Infinity"] },
    { type: "string", enum: ["-Infinity"] }
  ]
}

const fileJsonSchema: JsonSchema.JsonSchema = {
  type: "object",
  properties: {
    data: {
      type: "string",
      allOf: [{ pattern: "^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$" }]
    },
    type: { type: "string" },
    name: { type: "string" },
    lastModified: numberJsonSchema
  },
  required: ["data", "type", "name", "lastModified"],
  additionalProperties: false
}

const formDataJsonSchema: JsonSchema.JsonSchema = {
  type: "array",
  items: {
    type: "array",
    prefixItems: [
      { type: "string" },
      {
        anyOf: [
          {
            type: "object",
            properties: {
              _tag: { type: "string", enum: ["String"] },
              value: { type: "string" }
            },
            required: ["_tag", "value"],
            additionalProperties: false
          },
          {
            type: "object",
            properties: {
              _tag: { type: "string", enum: ["File"] },
              value: fileJsonSchema
            },
            required: ["_tag", "value"],
            additionalProperties: false
          }
        ]
      }
    ],
    minItems: 2,
    maxItems: 2
  }
}

const file = new File(["content"], "sample.txt", { type: "text/plain", lastModified: 0 })
const formData = new FormData()
formData.append("text", "value")

const cases: ReadonlyArray<AtomicDeclarationCase> = [
  {
    name: "Date",
    id: "effect/schema/Date",
    schema: Schema.Date,
    reviver: Schema.DateReviver,
    runtime: "Schema.Date",
    Type: "globalThis.Date",
    valid: new Date(0),
    invalid: "1970-01-01T00:00:00.000Z",
    jsonSchema: { type: "string" }
  },
  {
    name: "File",
    id: "effect/schema/File",
    schema: Schema.File,
    reviver: Schema.FileReviver,
    runtime: "Schema.File",
    Type: "globalThis.File",
    valid: file,
    invalid: { name: "sample.txt" },
    jsonSchema: fileJsonSchema
  },
  {
    name: "FormData",
    id: "effect/schema/FormData",
    schema: Schema.FormData,
    reviver: Schema.FormDataReviver,
    runtime: "Schema.FormData",
    Type: "globalThis.FormData",
    valid: formData,
    invalid: [["text", "value"]],
    jsonSchema: formDataJsonSchema
  },
  {
    name: "RegExp",
    id: "effect/schema/RegExp",
    schema: Schema.RegExp,
    reviver: Schema.RegExpReviver,
    runtime: "Schema.RegExp",
    Type: "globalThis.RegExp",
    valid: /a/i,
    invalid: "/a/i",
    jsonSchema: {
      type: "object",
      properties: {
        source: { type: "string" },
        flags: { type: "string" }
      },
      required: ["source", "flags"],
      additionalProperties: false
    }
  },
  {
    name: "Uint8Array",
    id: "effect/schema/Uint8Array",
    schema: Schema.Uint8Array,
    reviver: Schema.Uint8ArrayReviver,
    runtime: "Schema.Uint8Array",
    Type: "globalThis.Uint8Array",
    valid: new Uint8Array([1, 2]),
    invalid: [1, 2],
    jsonSchema: { type: "string", format: "byte", contentEncoding: "base64" }
  },
  {
    name: "URL",
    id: "effect/schema/URL",
    schema: Schema.URL,
    reviver: Schema.URLReviver,
    runtime: "Schema.URL",
    Type: "globalThis.URL",
    valid: new URL("https://example.com"),
    invalid: "https://example.com",
    jsonSchema: { type: "string" }
  },
  {
    name: "URLSearchParams",
    id: "effect/schema/URLSearchParams",
    schema: Schema.URLSearchParams,
    reviver: Schema.URLSearchParamsReviver,
    runtime: "Schema.URLSearchParams",
    Type: "globalThis.URLSearchParams",
    valid: new URLSearchParams("a=1"),
    invalid: "a=1",
    jsonSchema: { type: "string" }
  }
]

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

describe("SchemaRepresentation built-in atomic declarations", () => {
  it("emits the open declaration protocol and preserves legacy generation", () => {
    for (const entry of cases) {
      const annotations = entry.schema.ast.annotations as Schema.Annotations.Declaration<unknown>
      assert.deepStrictEqual(annotations.representation, {
        id: entry.id,
        payload: null
      })
      assert.strictEqual(typeof annotations.toJsonSchema, "function")
      if (typeof annotations.toJsonSchema === "function") {
        assert.deepStrictEqual(annotations.toJsonSchema({ typeParameters: [], schemas: [] }), entry.jsonSchema)
      }
      assert.strictEqual(typeof annotations.toCode, "function")
      if (typeof annotations.toCode === "function") {
        assert.deepStrictEqual(annotations.toCode({ typeParameters: [], schemas: [] }), {
          runtime: entry.runtime,
          Type: entry.Type
        })
      }
    }
  })

  it("revives every declaration without a global registry", () => {
    const document = SchemaRepresentation.fromASTs(
      cases.map((entry) => entry.schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const json = SchemaRepresentation.toJsonMultiDocument(document)
    const revived = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: cases.map((entry) => entry.reviver)
    })

    assert.strictEqual(revived.schemas.length, cases.length)
    for (let index = 0; index < cases.length; index++) {
      const entry = cases[index]
      const schema = noServices(revived.schemas[index])
      const annotations = schema.ast.annotations as Schema.Annotations.Declaration<unknown>
      assert.isTrue(Schema.decodeUnknownResult(schema)(entry.valid)._tag === "Success")
      assert.isTrue(Schema.decodeUnknownResult(schema)(entry.invalid)._tag === "Failure")
      assert.strictEqual(annotations.representation?.id, entry.id)
      assert.isTrue(typeof annotations.toJsonSchema === "function")
      assert.isTrue(typeof annotations.toCode === "function")
    }

    const lowered = SchemaRepresentation.fromASTs(
      revived.schemas.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    assert.deepStrictEqual(SchemaRepresentation.toJsonMultiDocument(lowered), json)
  })

  it("compiles the explicit encoded contracts and declaration code", () => {
    const document = SchemaRepresentation.fromASTs(
      cases.map((entry) => entry.schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    const jsonSchema = SchemaRepresentation.toJsonSchemaMultiDocument(document)
    const code = SchemaRepresentation.toCodeDocument(document)

    assert.deepStrictEqual(jsonSchema.schemas, [
      cases[0].jsonSchema,
      cases[1].jsonSchema,
      cases[2].jsonSchema,
      cases[3].jsonSchema,
      cases[4].jsonSchema,
      cases[5].jsonSchema,
      cases[6].jsonSchema
    ])
    for (let index = 0; index < cases.length; index++) {
      assert.isTrue(code.codes[index].runtime.includes(cases[index].runtime))
      assert.strictEqual(code.codes[index].Type, cases[index].Type)
    }
  })

  it("composes the Date declaration with a revived built-in check", () => {
    const original = Schema.Date.check(Schema.isDateValid()).annotate({ description: "valid date" })
    const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(original.ast))
    const revived = noServices(SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), {
      revivers: [Schema.DateReviver, Schema.isDateValidReviver]
    }))

    assert.isTrue(Schema.decodeUnknownResult(revived)(new Date(0))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(revived)(new Date(NaN))._tag === "Failure")
    assert.strictEqual(revived.ast.checks?.[0].annotations?.description, "valid date")

    const document = SchemaRepresentation.fromASTs([revived.ast])
    assert.deepStrictEqual(SchemaRepresentation.toJsonSchemaMultiDocument(document).schemas[0], {
      type: "string",
      allOf: [{ format: "date-time", description: "valid date" }]
    })
    const runtime = SchemaRepresentation.toCodeDocument(document).codes[0].runtime
    assert.isTrue(runtime.includes("Schema.Date"))
    assert.isTrue(runtime.includes("Schema.isDateValid()"))
  })

  it("rejects a non-null declaration payload", () => {
    const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(Schema.Date.ast)) as any
    json.representation.annotations.representation.payload = {}
    throws(
      () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [Schema.DateReviver] }),
      `Invalid representation payload for ${Schema.DateReviver.id}\n  at ["representation"]["annotations"]["representation"]["payload"]`
    )
  })
})
