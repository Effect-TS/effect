import { assert, describe, it } from "@effect/vitest"
import type { Options as AjvOptions } from "ajv"
import { Exit, JsonSchema, Schema, SchemaRepresentation } from "effect"

// oxlint-disable-next-line @typescript-eslint/no-require-imports
const Ajv2020 = require("ajv/dist/2020")

const ajv = new Ajv2020.default(
  {
    allErrors: true,
    strict: false,
    validateSchema: true,
    code: { esm: true }
  } satisfies AjvOptions
)

function compile(document: JsonSchema.Document<"draft-2020-12">) {
  return ajv.compile({
    $schema: JsonSchema.META_SCHEMA_URI_DRAFT_2020_12,
    ...document.schema,
    $defs: document.definitions
  })
}

function assertSameAcceptedValues(
  left: (input: unknown) => unknown,
  right: (input: unknown) => unknown,
  inputs: ReadonlyArray<unknown>
): void {
  for (const input of inputs) {
    assert.strictEqual(
      left(input) === true,
      right(input) === true,
      `Validation differs for ${JSON.stringify(input)}`
    )
  }
}

function assertJsonSchemaEquivalent(
  left: JsonSchema.Document<"draft-2020-12">,
  right: JsonSchema.Document<"draft-2020-12">,
  inputs: ReadonlyArray<unknown>
): void {
  assertSameAcceptedValues(compile(left), compile(right), inputs)
}

function assertJsonSchemaImportRoundTrip(
  schema: JsonSchema.JsonSchema,
  inputs: ReadonlyArray<unknown>
): void {
  const source = JsonSchema.fromSchemaDraft2020_12(schema)
  const imported = SchemaRepresentation.fromJsonSchemaDocument(source, { patterns: "apply" })
  const representation = SchemaRepresentation.toRepresentation(imported.ast)
  const emitted = SchemaRepresentation.toJsonSchemaDocument(representation)
  assertJsonSchemaEquivalent(source, emitted, inputs)

  const validate = compile(source)
  const decode = Schema.decodeUnknownExit(imported as unknown as Schema.ConstraintDecoder<unknown>, {
    onExcessProperty: "error"
  })
  assertSameAcceptedValues((input) => Exit.isSuccess(decode(input)), validate, inputs)
}

function assertRepresentationRoundTrip(
  schema: Schema.ConstraintDecoder<unknown>,
  inputs: ReadonlyArray<unknown>
): void {
  const emitted = Schema.toJsonSchemaDocument(schema)
  const imported = SchemaRepresentation.fromJsonSchemaDocument(emitted, { patterns: "apply" })
  const decodeSource = Schema.decodeUnknownExit(schema, { onExcessProperty: "error" })
  const decodeImported = Schema.decodeUnknownExit(imported as unknown as Schema.ConstraintDecoder<unknown>, {
    onExcessProperty: "error"
  })
  assertSameAcceptedValues(
    (input) => Exit.isSuccess(decodeImported(input)),
    (input) => Exit.isSuccess(decodeSource(input)),
    inputs
  )
  assertJsonSchemaEquivalent(emitted, Schema.toJsonSchemaDocument(imported), inputs)
}

describe("JSON Schema round-trip laws", () => {
  describe("toJsonSchema(fromJsonSchema(A))", () => {
    it("preserves empty closed objects", () => {
      assertJsonSchemaImportRoundTrip(
        { type: "object", additionalProperties: false },
        [{}, { a: 1 }, [], [1], null, 1]
      )
    })

    it("applies additionalProperties to required-only names", () => {
      assertJsonSchemaImportRoundTrip(
        { type: "object", required: ["a"], additionalProperties: false },
        [{}, { a: 1 }, { a: "a" }, { b: 1 }, []]
      )
    })

    it("applies an additionalProperties schema to required-only names", () => {
      assertJsonSchemaImportRoundTrip(
        { type: "object", required: ["a"], additionalProperties: { type: "string" } },
        [{}, { a: 1 }, { a: "a" }, { a: "a", b: "b" }, { a: "a", b: 1 }, []]
      )
    })

    it("preserves closed object scopes", () => {
      assertJsonSchemaImportRoundTrip(
        {
          type: "object",
          additionalProperties: false,
          allOf: [{ properties: { a: { type: "string" } } }]
        },
        [{}, { a: "a" }, { a: 1 }, { b: 1 }, { a: "a", b: 1 }, []]
      )
    })

    it("preserves sibling additionalProperties schemas", () => {
      assertJsonSchemaImportRoundTrip(
        {
          type: "object",
          properties: { a: { type: "string" } },
          allOf: [{ additionalProperties: { type: "boolean" } }]
        },
        [{}, { a: "a" }, { b: true }, { b: "b" }, { a: "a", b: true }, []]
      )
    })

    it("preserves open patternProperties", () => {
      assertJsonSchemaImportRoundTrip(
        {
          type: "object",
          patternProperties: { "^a": { type: "string" } }
        },
        [{}, { a: "a" }, { a: 1 }, { ab: "a", b: 1 }, { b: 1 }, []]
      )
    })
  })

  describe("fromJsonSchema(toJsonSchema(X))", () => {
    it("preserves structs", () => {
      assertRepresentationRoundTrip(
        Schema.Struct({ a: Schema.String }),
        [{}, { a: "a" }, { a: 1 }, { a: "a", b: 1 }, []]
      )
    })

    it("preserves string indexes", () => {
      assertRepresentationRoundTrip(
        Schema.Record(Schema.String, Schema.Union([Schema.Finite, Schema.String])),
        [{}, { a: "a" }, { a: 1 }, { a: true }, []]
      )
    })

    it("preserves pattern indexes", () => {
      assertRepresentationRoundTrip(
        Schema.Record(Schema.String.check(Schema.isUppercased()), Schema.Finite),
        [{}, { A: 1 }, { A: "a" }, { a: 1 }, { a: "a" }, []]
      )
    })

    it("preserves pattern and string indexes", () => {
      assertRepresentationRoundTrip(
        Schema.StructWithRest(Schema.Struct({}), [
          Schema.Record(Schema.String.check(Schema.isUppercased()), Schema.Finite),
          Schema.Record(Schema.String, Schema.Boolean)
        ]),
        [{}, { A: 1 }, { A: true }, { a: 1 }, { a: true }, []]
      )
    })

    it("preserves multiple string indexes", () => {
      assertRepresentationRoundTrip(
        Schema.StructWithRest(Schema.Struct({}), [
          Schema.Record(Schema.String, Schema.Union([Schema.Boolean, Schema.String])),
          Schema.Record(Schema.String, Schema.Union([Schema.Boolean, Schema.Finite]))
        ]),
        [{}, { a: true }, { a: false }, { a: 1 }, { a: "a" }, []]
      )
    })

    it("applies string indexes to explicit properties", () => {
      assertRepresentationRoundTrip(
        Schema.StructWithRest(Schema.Struct({ a: Schema.Union([Schema.String, Schema.Boolean]) }), [
          Schema.Record(Schema.String, Schema.Boolean)
        ]),
        [{}, { a: true }, { a: false }, { a: "a" }, { a: 1 }, { a: true, b: false }, []]
      )
    })
  })
})
