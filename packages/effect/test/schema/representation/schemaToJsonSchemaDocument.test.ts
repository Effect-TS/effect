import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"

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

  it("shares a named definition across required and optional keys when JSON codec derivation rebuilds it", () => {
    const Value = Schema.Struct({ value: Schema.Unknown }).annotate({ identifier: "Value" })
    const schema = Schema.Struct({
      required: Value,
      optional: Schema.optionalKey(Value)
    })

    const document = Schema.toJsonSchemaDocument(schema)

    assert.deepStrictEqual(Object.keys(document.definitions), ["Value"])
    assert.deepStrictEqual(document.schema, {
      type: "object",
      properties: {
        required: { $ref: "#/$defs/Value" },
        optional: { $ref: "#/$defs/Value" }
      },
      required: ["required"],
      additionalProperties: true
    })
  })

  it("inlines repeated anonymous schemas by default", () => {
    const shared = Schema.Struct({ value: Schema.String })

    assert.deepStrictEqual(
      Schema.toJsonSchemaDocument(Schema.Struct({ first: shared, second: shared })),
      {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            first: {
              type: "object",
              properties: { value: { type: "string" } },
              required: ["value"],
              additionalProperties: true
            },
            second: {
              type: "object",
              properties: { value: { type: "string" } },
              required: ["value"],
              additionalProperties: true
            }
          },
          required: ["first", "second"],
          additionalProperties: true
        },
        definitions: {}
      }
    )
  })

  it("forwards the reference policy to representation and JSON Schema generation", () => {
    const shared = Schema.String.annotate({ identifier: "Shared" })
    const options = { referencePolicy: () => undefined }

    assert.deepStrictEqual(Schema.toRepresentation(shared, options).references, {})
    assert.deepStrictEqual(Schema.toJsonSchemaDocument(shared, options), {
      dialect: "draft-2020-12",
      schema: { type: "string" },
      definitions: {}
    })

    const inputs: Array<SchemaRepresentation.ReferencePolicyInput> = []
    Schema.toJsonSchemaDocument(Schema.Date.annotate({ identifier: "Date" }), {
      referencePolicy: (input) => {
        inputs.push(input)
        return undefined
      }
    })
    assert.strictEqual(inputs[0].ast._tag, "String")
    assert.strictEqual(inputs[0].identifier, "DateEncoded")
  })

  it("projects encoded tuple elements for JSON Schema", () => {
    assert.deepStrictEqual(Schema.toJsonSchemaDocument(Schema.Tuple([Schema.NumberFromString])).schema, {
      type: "array",
      prefixItems: [{ type: "string" }],
      minItems: 1,
      maxItems: 1
    })
  })

  it("does not project checks through an artificial JSON encoding", () => {
    assert.deepStrictEqual(
      Schema.toJsonSchemaDocument(Schema.Number.check(Schema.isGreaterThan(0))),
      {
        dialect: "draft-2020-12",
        schema: {
          anyOf: [
            { type: "number" },
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

  it("preserves checks when no artificial JSON encoding is needed", () => {
    assert.deepStrictEqual(
      Schema.toJsonSchemaDocument(Schema.Number.check(Schema.isFinite(), Schema.isGreaterThan(0))),
      {
        dialect: "draft-2020-12",
        schema: {
          type: "number",
          exclusiveMinimum: 0
        },
        definitions: {}
      }
    )
  })

  it("does not project annotations through an artificial JSON encoding", () => {
    const schema = Schema.Number.annotate({ description: "source description" })
    const expected = {
      dialect: "draft-2020-12" as const,
      schema: {
        anyOf: [
          { type: "number" },
          { type: "string", enum: ["Infinity", "-Infinity", "NaN"] }
        ]
      },
      definitions: {}
    }

    assert.deepStrictEqual(Schema.toJsonSchemaDocument(schema), expected)
    assert.deepStrictEqual(Schema.toJsonSchemaDocument(Schema.toCodecJson(schema)), expected)
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
      onExcessProperty: "ignore",
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
            minLength: 1,
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
      contentMediaType: "application/json",
      contentSchema: {
        type: "object",
        properties: {
          value: { type: "string" }
        },
        required: ["value"],
        additionalProperties: true
      }
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

  it("exports isNot without rejecting values the runtime check accepts", () => {
    const forbidden = Schema.String.check(Schema.makeFilter((s: string) => s === "bad"))
    const cases: ReadonlyArray<readonly [Schema.Top, unknown]> = [
      [Schema.String.check(Schema.isNot(forbidden)), "good"],
      [Schema.String.check(Schema.isNot(forbidden.annotate({ identifier: "Forbidden" }))), "good"],
      [Schema.String.check(Schema.isNot(Schema.Number)), "NaN"],
      [Schema.Null.check(Schema.isNot(Schema.Undefined)), null]
    ]
    for (const [schema, value] of cases) {
      assert.isTrue(Schema.is(schema)(value))
      const imported = SchemaRepresentation.fromJsonSchemaDocument(Schema.toJsonSchemaDocument(schema))
      assert.isTrue(Schema.is(imported)(value))
      assert.isFalse(Schema.is(imported)(1))
    }

    const union = Schema.Union([cases[0][0], Schema.Number], { mode: "oneOf" })
    assert.isUndefined(Schema.toJsonSchemaDocument(union).schema.oneOf)
  })

  it("exports isNot without rejecting JSON whose host decoding changes the checked value", () => {
    const cases: ReadonlyArray<readonly [Schema.Codec<unknown, unknown>, unknown]> = [
      [Schema.Struct({ n: Schema.Number }).check(Schema.isNot(Schema.Struct({ n: Schema.Literal("NaN") }))), {
        n: "NaN"
      }],
      [Schema.Struct({ n: Schema.NumberFromString }).check(Schema.isNot(Schema.Struct({ n: Schema.Literal("1") }))), {
        n: "1"
      }]
    ]
    for (const [schema, input] of cases) {
      assert.strictEqual(Schema.decodeUnknownResult(Schema.toCodecJson(schema))(input)._tag, "Success")
      const imported = SchemaRepresentation.fromJsonSchemaDocument(Schema.toJsonSchemaDocument(schema))
      assert.isTrue(Schema.is(imported)(input))
      assert.isFalse(Schema.is(imported)({ n: true }))
    }

    const union = Schema.Union([cases[0][0], Schema.String], { mode: "oneOf" })
    assert.isUndefined(Schema.toJsonSchemaDocument(union).schema.oneOf)
  })

  it("exports JSON values exactly inside oneOf", () => {
    for (const json of [Schema.Json, Schema.MutableJson]) {
      const schema = Schema.Union([json, Schema.String], { mode: "oneOf" })
      const document = Schema.toJsonSchemaDocument(schema)
      assert.isDefined(document.schema.oneOf)
      for (const candidate of [schema, SchemaRepresentation.fromJsonSchemaDocument(document)]) {
        assert.isTrue(Schema.is(candidate)(1))
        assert.isFalse(Schema.is(candidate)("x"))
      }
    }
  })

  it("exports a representation-level isNot without rejecting values its host encodes", () => {
    const host = Schema.Number.check(Schema.isNot(Schema.Literal("NaN")))
    const imported = SchemaRepresentation.fromJsonSchemaDocument(
      SchemaRepresentation.toJsonSchemaDocument(Schema.toRepresentation(host))
    )
    assert.isTrue(Schema.is(imported)("NaN"))
    assert.isFalse(Schema.is(imported)(true))

    const union = Schema.Union([host, Schema.Boolean], { mode: "oneOf" })
    assert.isUndefined(SchemaRepresentation.toJsonSchemaDocument(Schema.toRepresentation(union)).schema.oneOf)
  })

  it("keeps isNot on a recursive host without transformations", () => {
    interface Category {
      readonly name: string
      readonly child?: Category
    }
    const Category: Schema.Codec<Category> = Schema.Struct({
      name: Schema.String,
      child: Schema.optionalKey(Schema.suspend((): Schema.Codec<Category> => Category))
    }).check(Schema.isNot(Schema.Struct({ name: Schema.Literal("forbidden") }))).annotate({ identifier: "Category" })
    const document = Schema.toJsonSchemaDocument(Category)
    assert.isDefined(document.definitions.Category.not)

    const imported = SchemaRepresentation.fromJsonSchemaDocument(document)
    assert.isTrue(Schema.is(imported)({ name: "root", child: { name: "leaf" } }))
    assert.isFalse(Schema.is(imported)({ name: "forbidden" }))
    assert.isFalse(Schema.is(imported)({ name: "root", child: { name: "forbidden" } }))
  })
})
