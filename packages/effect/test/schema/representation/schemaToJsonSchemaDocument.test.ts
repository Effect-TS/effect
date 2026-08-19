import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaGetter, SchemaTransformation } from "effect"

describe("Schema.toJsonSchemaDocument", () => {
  it("uses the encoded side for representations and JSON Schema", () => {
    const representation = Schema.toRepresentation(Schema.FiniteFromString)
    assert.strictEqual(representation.representation._tag, "String")

    const typeRepresentation = Schema.toRepresentation(Schema.toType(Schema.FiniteFromString))
    assert.strictEqual(typeRepresentation.representation._tag, "Number")

    assert.deepStrictEqual(Schema.toJsonSchemaDocument(Schema.FiniteFromString), {
      dialect: "draft-2020-12",
      schema: { type: "string" },
      definitions: {}
    })
  })

  it("projects encoded tuple elements for JSON Schema", () => {
    assert.deepStrictEqual(Schema.toJsonSchemaDocument(Schema.Tuple([Schema.NumberFromString])).schema, {
      type: "array",
      prefixItems: [{ type: "string" }],
      minItems: 1,
      maxItems: 1
    })
  })

  it("preserves Number checks on the finite encoded branch", () => {
    assert.deepStrictEqual(
      Schema.toJsonSchemaDocument(Schema.Number.check(Schema.isGreaterThan(0))),
      {
        dialect: "draft-2020-12",
        schema: {
          anyOf: [
            {
              type: "number",
              exclusiveMinimum: 0
            },
            {
              type: "string",
              enum: ["Infinity", "-Infinity", "NaN"]
            }
          ]
        },
        definitions: {}
      }
    )
  })

  it("preserves selected annotations when JSON derivation introduces an encoding", () => {
    assert.deepStrictEqual(
      Schema.toJsonSchemaDocument(
        Schema.Number.annotate({
          title: "Numeric value",
          description: "A finite or non-finite number",
          documentation: "Numeric documentation",
          readOnly: true,
          writeOnly: false,
          default: 0,
          examples: [1],
          format: "numeric",
          custom: "custom value"
        }),
        {
          includeAnnotationKey: (key) => key === "documentation" || key === "custom"
        }
      ),
      {
        dialect: "draft-2020-12",
        schema: {
          anyOf: [
            { type: "number" },
            {
              type: "string",
              enum: ["Infinity", "-Infinity", "NaN"]
            }
          ],
          title: "Numeric value",
          description: "A finite or non-finite number",
          documentation: "Numeric documentation",
          readOnly: true,
          writeOnly: false
        },
        definitions: {}
      }
    )
  })

  it("preserves annotations for every built-in artificial JSON encoding", () => {
    const schemas = [
      Schema.Unknown,
      Schema.ObjectKeyword,
      Schema.Undefined,
      Schema.Void,
      Schema.Literal(1n),
      Schema.Number,
      Schema.UniqueSymbol(Symbol.for("a")),
      Schema.Symbol,
      Schema.BigInt,
      Schema.declare((input): input is object => typeof input === "object" && input !== null)
    ] as const

    for (const schema of schemas) {
      const jsonSchema = Schema.toJsonSchemaDocument(schema.annotate({ title: "source title" })).schema
      assert.strictEqual(jsonSchema.title, "source title", schema.ast._tag)
    }
  })

  it("preserves annotations already present on the artificial JSON encoding", () => {
    const schema = Schema.declare((input): input is URL => input instanceof URL, {
      title: "source title",
      description: "source description",
      documentation: "source documentation",
      readOnly: true,
      writeOnly: true,
      toCodecJson: () =>
        Schema.link<URL>()(
          Schema.String.annotate({
            title: "target title",
            description: "target description",
            readOnly: false
          }).check(Schema.isMinLength(1)),
          SchemaTransformation.transform({
            decode: (url) => new URL(url),
            encode: (url) => url.href
          })
        )
    })

    const jsonSchema = Schema.toJsonSchemaDocument(schema, {
      includeAnnotationKey: (key) => key === "documentation"
    }).schema

    assert.deepStrictEqual(
      {
        title: jsonSchema.title,
        description: jsonSchema.description,
        documentation: jsonSchema.documentation,
        readOnly: jsonSchema.readOnly,
        writeOnly: jsonSchema.writeOnly
      },
      {
        title: "target title",
        description: "target description",
        documentation: "source documentation",
        readOnly: false,
        writeOnly: true
      }
    )
  })

  it("inherits annotations only from the terminal encoded side", () => {
    const schema = Schema.String.annotate({ description: "type description" }).pipe(
      Schema.encodeTo(Schema.Number.annotate({ title: "encoded title" }), {
        decode: SchemaGetter.transform((value: number) => String(value)),
        encode: SchemaGetter.transform((value: string) => Number(value))
      })
    )

    const jsonSchema = Schema.toJsonSchemaDocument(schema).schema

    assert.strictEqual(jsonSchema.title, "encoded title")
    assert.strictEqual(jsonSchema.description, undefined)
  })

  it("does not inherit annotations resolved from checks", () => {
    const schema = Schema.Number.check(Schema.isGreaterThan(0)).annotate({ description: "positive number" })

    assert.strictEqual(Schema.toJsonSchemaDocument(schema).schema.description, undefined)
  })

  it("preserves output, references and generation options", () => {
    const shared = Schema.String.check(Schema.isMinLength(2)).annotate({
      identifier: "Shared",
      description: "shared text",
      "x-consumer": "kept"
    })
    const schema = Schema.Struct({
      first: shared,
      second: shared,
      count: Schema.FiniteFromString
    }).annotate({ description: "root" })
    const options: Schema.ToJsonSchemaOptions = {
      additionalProperties: true,
      generateDescriptions: true,
      includeAnnotationKey: (key) => key === "x-consumer"
    }

    assert.deepStrictEqual(Schema.toJsonSchemaDocument(schema, options), {
      dialect: "draft-2020-12",
      schema: {
        type: "object",
        properties: {
          first: { $ref: "#/$defs/Shared" },
          second: { $ref: "#/$defs/Shared" },
          count: {
            type: "string",
            description: "a string that will be decoded as a finite number"
          }
        },
        required: ["first", "second", "count"],
        additionalProperties: true,
        description: "root"
      },
      definitions: {
        Shared: {
          type: "string",
          allOf: [{
            minLength: 2,
            description: "shared text",
            "x-consumer": "kept"
          }]
        }
      }
    })
  })

  it("uses custom compiler annotations without a central built-in switch", () => {
    const custom = Schema.String.check(Schema.makeFilter<string>((value) => value.length >= 2, {
      representation: {
        id: "test/schema/minTwoCharacters",
        payload: null
      },
      toJsonSchema: () => ({ minLength: 2 })
    }))

    assert.deepStrictEqual(Schema.toJsonSchemaDocument(custom), {
      dialect: "draft-2020-12",
      schema: {
        type: "string",
        minLength: 2
      },
      definitions: {}
    })
  })

  it("emits JSON content media types after encoded projection", () => {
    const schema = Schema.fromJsonString(Schema.Struct({
      value: Schema.FiniteFromString
    }))

    assert.deepStrictEqual(Schema.toJsonSchemaDocument(schema).schema, {
      type: "string",
      contentMediaType: "application/json"
    })
  })

  it("approximates declarations without a JSON codec", () => {
    const schema = Schema.declare((input): input is string => typeof input === "string", {
      representation: {
        id: "test/schema/opaqueString",
        payload: null
      }
    })

    assert.deepStrictEqual(Schema.toJsonSchemaDocument(schema), {
      dialect: "draft-2020-12",
      schema: {},
      definitions: {}
    })
  })
})
