import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, throws } from "@effect/vitest/utils"
import Ajv from "ajv"
import * as A from "effect/Arbitrary"
import * as fc from "effect/FastCheck"
import * as JSONSchema from "effect/JSONSchema"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"

type Root = JSONSchema.JsonSchema7Root

const ajvOptions: Ajv.Options = {
  strictTuples: false,
  allowMatchingProperties: true
}

const getAjvValidate = (jsonSchema: Root): Ajv.ValidateFunction =>
  // new instance of Ajv is created for each schema to avoid error: "schema with key or id "/schemas/any" already exists"
  new Ajv.default(ajvOptions).compile(jsonSchema)

const expectProperty = <A, I>(
  schema: Schema.Schema<A, I>,
  jsonSchema: JSONSchema.JsonSchema7,
  params?: fc.Parameters<[I]>
) => {
  if (false as boolean) {
    const encodedBoundSchema = Schema.encodedBoundSchema(schema)
    const arb = A.make(encodedBoundSchema)
    const is = Schema.is(encodedBoundSchema)
    const validate = getAjvValidate(jsonSchema)
    fc.assert(fc.property(arb, (i) => is(i) && validate(i)), params)
  }
}

const expectJSONSchema = <A, I>(
  schema: Schema.Schema<A, I>,
  expectedJsonSchema: object
) => {
  const jsonSchema = JSONSchema.make(schema)
  deepStrictEqual(jsonSchema, {
    "$schema": "http://json-schema.org/draft-07/schema#",
    ...expectedJsonSchema
  } as any)
  return jsonSchema
}

const expectJSONSchema2019 = <A, I>(
  schema: Schema.Schema<A, I>,
  expectedJsonSchema: object,
  expectedDefinitions: object
) => {
  const definitions = {}
  const jsonSchema = JSONSchema.fromAST(schema.ast, {
    definitions,
    target: "jsonSchema2019-09"
  })
  deepStrictEqual(jsonSchema, expectedJsonSchema)
  deepStrictEqual(definitions, expectedDefinitions)
  return jsonSchema
}

const expectJSONSchemaOpenApi31 = <A, I>(
  schema: Schema.Schema<A, I>,
  expectedJsonSchema: object,
  expectedDefinitions: object
) => {
  const definitions = {}
  const jsonSchema = JSONSchema.fromAST(schema.ast, {
    definitions,
    target: "openApi3.1"
  })
  deepStrictEqual(jsonSchema, expectedJsonSchema)
  deepStrictEqual(definitions, expectedDefinitions)
  return jsonSchema
}

const expectJSONSchemaProperty = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  params?: fc.Parameters<[I]>
) => {
  const jsonSchema = expectJSONSchema(schema, expected)
  expectProperty(schema, jsonSchema, params)
}

const expectJSONSchemaAnnotations = <A, I>(
  schema: Schema.Schema<A, I>,
  expected: object,
  params?: fc.Parameters<[I]>
) => {
  expectJSONSchemaProperty(schema, expected, params)
  const jsonSchemaAnnotations = {
    description: "269d3e58-8fb2-43cb-a389-8146c353fdd5",
    title: "5401c637-61f2-49b8-b74d-17f058c2670f"
  }
  expectJSONSchemaProperty(schema.annotations(jsonSchemaAnnotations), { ...expected, ...jsonSchemaAnnotations }, params)
}

const expectError = <A, I>(schema: Schema.Schema<A, I>, message: string) => {
  throws(() => JSONSchema.make(schema), new Error(message))
}

// Using this instead of Schema.JsonNumber to avoid cluttering the output with unnecessary description and title
const JsonNumber = Schema.Number.pipe(Schema.filter((n) => Number.isFinite(n), { jsonSchema: {} }))

describe("fromAST", () => {
  it("definitionsPath", () => {
    const schema = Schema.String.annotations({ identifier: "08368672-2c02-4d6d-92b0-dd0019b33a7b" })
    const definitions = {}
    const jsonSchema = JSONSchema.fromAST(schema.ast, {
      definitions,
      definitionPath: "#/components/schemas/"
    })
    deepStrictEqual(jsonSchema, {
      "$ref": "#/components/schemas/08368672-2c02-4d6d-92b0-dd0019b33a7b"
    })
    deepStrictEqual(definitions, {
      "08368672-2c02-4d6d-92b0-dd0019b33a7b": {
        "type": "string"
      }
    })
  })

  describe("target", () => {
    describe("jsonSchema7", () => {
      describe("nullable handling", () => {
        it("Null", () => {
          const schema = Schema.Null
          expectJSONSchemaAnnotations(schema, { "type": "null" })
        })

        it("NullOr(String)", () => {
          const schema = Schema.NullOr(Schema.String)
          expectJSONSchemaAnnotations(schema, {
            "anyOf": [
              { "type": "string" },
              { "type": "null" }
            ]
          })
        })

        it("NullOr(Any)", () => {
          const schema = Schema.NullOr(Schema.Any)
          expectJSONSchemaAnnotations(schema, {
            "$id": "/schemas/any",
            "title": "any"
          })
        })

        it("NullOr(Unknown)", () => {
          const schema = Schema.NullOr(Schema.Unknown)
          expectJSONSchemaAnnotations(schema, {
            "$id": "/schemas/unknown",
            "title": "unknown"
          })
        })

        it("NullOr(Void)", () => {
          const schema = Schema.NullOr(Schema.Void)
          expectJSONSchemaAnnotations(schema, {
            "$id": "/schemas/void",
            "title": "void"
          })
        })

        it("Literal | null", () => {
          const schema = Schema.Literal("a", null)
          expectJSONSchemaAnnotations(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              { "type": "null" }
            ]
          })
        })

        it("Literal | null(with description)", () => {
          const schema = Schema.Union(Schema.Literal("a"), Schema.Null.annotations({ description: "mydescription" }))
          expectJSONSchemaAnnotations(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              {
                "type": "null",
                "description": "mydescription"
              }
            ]
          })
        })

        it("Nested nullable unions", () => {
          const schema = Schema.Union(Schema.NullOr(Schema.String), Schema.Literal("a", null))
          expectJSONSchemaAnnotations(schema, {
            "anyOf": [
              {
                "anyOf": [
                  { "type": "string" },
                  { "type": "null" }
                ]
              },
              {
                "anyOf": [
                  { "type": "string", "enum": ["a"] },
                  { "type": "null" }
                ]
              }
            ]
          })
        })
      })

      it("parseJson handling", () => {
        const schema = Schema.parseJson(Schema.Struct({
          a: Schema.parseJson(Schema.NumberFromString)
        }))
        const definitions = {}
        const jsonSchema = JSONSchema.fromAST(schema.ast, {
          definitions
        })
        deepStrictEqual(jsonSchema, {
          "type": "string",
          "contentMediaType": "application/json"
        })
        deepStrictEqual(definitions, {})
      })
    })

    describe("jsonSchema2019-09", () => {
      describe("nullable handling", () => {
        it("Null", () => {
          const schema = Schema.Null
          expectJSONSchema2019(schema, { "type": "null" }, {})
        })

        it("NullOr(String)", () => {
          const schema = Schema.NullOr(Schema.String)
          expectJSONSchema2019(schema, {
            "anyOf": [
              { "type": "string" },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Any)", () => {
          const schema = Schema.NullOr(Schema.Any)
          expectJSONSchema2019(schema, {
            "$id": "/schemas/any",
            "title": "any"
          }, {})
        })

        it("NullOr(Unknown)", () => {
          const schema = Schema.NullOr(Schema.Unknown)
          expectJSONSchema2019(schema, {
            "$id": "/schemas/unknown",
            "title": "unknown"
          }, {})
        })

        it("NullOr(Void)", () => {
          const schema = Schema.NullOr(Schema.Void)
          expectJSONSchema2019(schema, {
            "$id": "/schemas/void",
            "title": "void"
          }, {})
        })

        it("Literal | null", () => {
          const schema = Schema.Literal("a", null)
          expectJSONSchema2019(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("Literal | null(with description)", () => {
          const schema = Schema.Union(Schema.Literal("a"), Schema.Null.annotations({ description: "mydescription" }))
          expectJSONSchema2019(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              {
                "type": "null",
                "description": "mydescription"
              }
            ]
          }, {})
        })

        it("Nested nullable unions", () => {
          const schema = Schema.Union(Schema.NullOr(Schema.String), Schema.Literal("a", null))
          expectJSONSchema2019(schema, {
            "anyOf": [
              {
                "anyOf": [
                  { "type": "string" },
                  { "type": "null" }
                ]
              },
              {
                "anyOf": [
                  { "type": "string", "enum": ["a"] },
                  { "type": "null" }
                ]
              }
            ]
          }, {})
        })
      })

      it("parseJson handling", () => {
        const schema = Schema.parseJson(Schema.Struct({
          a: Schema.parseJson(Schema.NumberFromString)
        }))
        expectJSONSchema2019(schema, {
          "type": "string",
          "contentMediaType": "application/json",
          "contentSchema": {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string",
                "contentMediaType": "application/json",
                "contentSchema": {
                  "$ref": "#/$defs/NumberFromString"
                }
              }
            },
            "additionalProperties": false
          }
        }, {
          "NumberFromString": {
            "description": "a string to be decoded into a number",
            "type": "string"
          }
        })
      })
    })

    describe("openApi3.1", () => {
      describe("nullable handling", () => {
        it("Null", () => {
          const schema = Schema.Null
          expectJSONSchemaOpenApi31(schema, { "type": "null" }, {})
        })

        it("NullOr(String)", () => {
          const schema = Schema.NullOr(Schema.String)
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              { "type": "string" },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Any)", () => {
          const schema = Schema.NullOr(Schema.Any)
          expectJSONSchemaOpenApi31(schema, {
            "$id": "/schemas/any",
            "title": "any"
          }, {})
        })

        it("NullOr(Unknown)", () => {
          const schema = Schema.NullOr(Schema.Unknown)
          expectJSONSchemaOpenApi31(schema, {
            "$id": "/schemas/unknown",
            "title": "unknown"
          }, {})
        })

        it("NullOr(Void)", () => {
          const schema = Schema.NullOr(Schema.Void)
          expectJSONSchemaOpenApi31(schema, {
            "$id": "/schemas/void",
            "title": "void"
          }, {})
        })

        it("NullOr(Object)", () => {
          const schema = Schema.NullOr(Schema.Object)
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "$id": "/schemas/object",
                "anyOf": [
                  { "type": "object" },
                  { "type": "array" }
                ],
                "description": "an object in the TypeScript meaning, i.e. the `object` type",
                "title": "object"
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Struct({}))", () => {
          const schema = Schema.NullOr(Schema.Struct({}))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "$id": "/schemas/%7B%7D",
                "anyOf": [
                  { "type": "object" },
                  { "type": "array" }
                ]
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Ref)", () => {
          const schema = Schema.NullOr(
            Schema.String.annotations({ identifier: "b812aaa1-cfe1-4dda-8c9c-360bfa6cb855" })
          )
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "$ref": "#/$defs/b812aaa1-cfe1-4dda-8c9c-360bfa6cb855"
              },
              { "type": "null" }
            ]
          }, {
            "b812aaa1-cfe1-4dda-8c9c-360bfa6cb855": {
              "type": "string"
            }
          })
        })

        it("NullOr(Number)", () => {
          const schema = Schema.NullOr(Schema.Number)
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              { "type": "number" },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Int)", () => {
          const schema = Schema.NullOr(Schema.Int)
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "$ref": "#/$defs/Int"
              },
              { "type": "null" }
            ]
          }, {
            "Int": {
              "title": "int",
              "description": "an integer",
              "type": "integer"
            }
          })
        })

        it("NullOr(Boolean)", () => {
          const schema = Schema.NullOr(Schema.Boolean)
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              { "type": "boolean" },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Array)", () => {
          const schema = Schema.NullOr(Schema.Array(Schema.String))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "items": { "type": "string" },
                "type": "array"
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Enum)", () => {
          enum Fruits {
            Apple,
            Banana
          }
          const schema = Schema.NullOr(Schema.Enums(Fruits))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "$comment": "/schemas/enums",
                "anyOf": [
                  {
                    "type": "number",
                    "title": "Apple",
                    "enum": [0]
                  },
                  {
                    "type": "number",
                    "title": "Banana",
                    "enum": [1]
                  }
                ]
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("NullOr(Literal)", () => {
          const schema = Schema.NullOr(Schema.Literal("a"))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("Literal | null", () => {
          const schema = Schema.Literal("a", null)
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              { "type": "null" }
            ]
          }, {})
        })

        it("Literal | null(with description)", () => {
          const schema = Schema.Union(Schema.Literal("a"), Schema.Null.annotations({ description: "mydescription" }))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "type": "string",
                "enum": ["a"]
              },
              {
                "description": "mydescription",
                "type": "null"
              }
            ]
          }, {})
        })

        it("Nested nullable unions", () => {
          const schema = Schema.Union(Schema.NullOr(Schema.String), Schema.Literal("a", null))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "anyOf": [
                  { "type": "string" },
                  { "type": "null" }
                ]
              },
              {
                "anyOf": [
                  { "type": "string", "enum": ["a"] },
                  { "type": "null" }
                ]
              }
            ]
          }, {})
        })

        it("NullOr(Struct({ a: String }))", () => {
          const schema = Schema.NullOr(Schema.Struct({ a: Schema.String }))
          expectJSONSchemaOpenApi31(schema, {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": { "a": { "type": "string" } },
                "required": ["a"],
                "type": "object"
              },
              { "type": "null" }
            ]
          }, {})
        })
      })

      it("parseJson handling", () => {
        const schema = Schema.parseJson(Schema.Struct({
          a: Schema.parseJson(Schema.NumberFromString)
        }))
        expectJSONSchemaOpenApi31(schema, {
          "type": "string",
          "contentMediaType": "application/json",
          "contentSchema": {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string",
                "contentMediaType": "application/json",
                "contentSchema": {
                  "$ref": "#/$defs/NumberFromString"
                }
              }
            },
            "additionalProperties": false
          }
        }, {
          "NumberFromString": {
            "description": "a string to be decoded into a number",
            "type": "string"
          }
        })
      })
    })
  })

  describe("topLevelReferenceStrategy", () => {
    it(`"skip"`, () => {
      const schema = Schema.String.annotations({ identifier: "1b205579-f159-48d4-a218-f09426bca040" })
      const definitions = {}
      const jsonSchema = JSONSchema.fromAST(schema.ast, {
        definitions,
        topLevelReferenceStrategy: "skip"
      })
      deepStrictEqual(jsonSchema, {
        "type": "string"
      })
      deepStrictEqual(definitions, {})
    })
  })

  describe("additionalPropertiesStrategy", () => {
    it(`"allow"`, () => {
      const schema = Schema.Struct({ a: Schema.String })
      const definitions = {}
      const jsonSchema = JSONSchema.fromAST(schema.ast, {
        definitions,
        additionalPropertiesStrategy: "allow"
      })
      deepStrictEqual(jsonSchema, {
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          }
        },
        "required": ["a"],
        "additionalProperties": true
      })
      deepStrictEqual(definitions, {})
    })
  })
})

describe("make", () => {
  it("should filter out non-JSON values and cyclic references from default and examples", () => {
    const cyclic: any = { value: "test" }
    cyclic.self = cyclic
    const schema = Schema.String.annotations({ default: 1n as any, examples: ["a", 1n as any, cyclic, "b"] })
    expectJSONSchemaAnnotations(schema, {
      "type": "string",
      "examples": ["a", "b"]
    })
  })

  it("handling of a top level `parseJson` should targeting the \"to\" side", () => {
    const schema = Schema.parseJson(Schema.Struct({
      a: Schema.parseJson(Schema.NumberFromString)
    }))
    expectJSONSchema(
      schema,
      {
        "type": "object",
        "required": ["a"],
        "properties": {
          "a": {
            "type": "string",
            "contentMediaType": "application/json"
          }
        },
        "additionalProperties": false
      }
    )
  })

  describe("Unsupported schemas", () => {
    describe("Missing jsonSchema annotation Error", () => {
      it("Declaration", () => {
        expectError(
          Schema.ChunkFromSelf(JsonNumber),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): Chunk<{ number | filter }>`
        )
      })

      it("BigIntFromSelf", () => {
        expectError(
          Schema.BigIntFromSelf,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (BigIntKeyword): bigint`
        )
      })

      it("SymbolFromSelf", () => {
        expectError(
          Schema.SymbolFromSelf,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
        )
      })

      it("UniqueSymbolFromSelf", () => {
        expectError(
          Schema.UniqueSymbolFromSelf(Symbol.for("effect/Schema/test/a")),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UniqueSymbol): Symbol(effect/Schema/test/a)`
        )
      })

      it("Undefined", () => {
        expectError(
          Schema.Undefined,
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
        )
      })

      it("Schema.Literal with a bigint literal", () => {
        expectError(
          Schema.Literal(1n),
          `Missing annotation
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Literal): 1n`
        )
      })

      it("Tuple with an unsupported component", () => {
        expectError(
          Schema.Tuple(Schema.Undefined),
          `Missing annotation
at path: [0]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (UndefinedKeyword): undefined`
        )
      })

      it("Struct with an unsupported field", () => {
        expectError(
          Schema.Struct({ a: Schema.SymbolFromSelf }),
          `Missing annotation
at path: ["a"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
        )
      })
    })

    describe("Missing identifier annotation Error", () => {
      it("Suspend", () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema = Schema.Struct({
          a: Schema.String,
          as: Schema.Array(Schema.suspend((): Schema.Schema<A> => schema))
        })
        expectError(
          schema,
          `Missing annotation
at path: ["as"]
details: Generating a JSON Schema for this schema requires an "identifier" annotation
schema (Suspend): <suspended schema>`
        )
      })
    })

    describe("Unsupported index signature parameter", () => {
      it("Record(SymbolFromSelf, number)", () => {
        expectError(
          Schema.Record({ key: Schema.SymbolFromSelf, value: JsonNumber }),
          `Missing annotation
at path: ["[symbol]"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (SymbolKeyword): symbol`
        )
      })
    })

    describe("Unsupported key", () => {
      it("should raise an error if there is a property named with a symbol", () => {
        const a = Symbol.for("effect/Schema/test/a")
        expectError(
          Schema.Struct({ [a]: Schema.String }),
          `Unsupported key
details: Cannot encode Symbol(effect/Schema/test/a) key to JSON Schema`
        )
      })
    })

    describe("Unsupported post-rest elements", () => {
      it("r e should raise an error", () => {
        expectError(
          Schema.Tuple([], JsonNumber, Schema.String),
          "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request"
        )
      })
    })
  })

  it("Never", () => {
    const jsonSchema: Root = {
      "$id": "/schemas/never",
      "not": {},
      "title": "never"
    }
    expectJSONSchema(Schema.Never, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    assertFalse(validate(null))
  })

  it("Any", () => {
    expectJSONSchemaAnnotations(Schema.Any, {
      "$id": "/schemas/any",
      "title": "any"
    })
  })

  it("Unknown", () => {
    expectJSONSchemaAnnotations(Schema.Unknown, {
      "$id": "/schemas/unknown",
      "title": "unknown"
    })
  })

  it("Object", () => {
    const jsonSchema: Root = {
      "$id": "/schemas/object",
      "anyOf": [
        { "type": "object" },
        { "type": "array" }
      ],
      "description": "an object in the TypeScript meaning, i.e. the `object` type",
      "title": "object"
    }
    expectJSONSchemaAnnotations(Schema.Object, jsonSchema)

    const validate = getAjvValidate(jsonSchema)
    assertTrue(validate({}))
    assertTrue(validate({ a: 1 }))
    assertTrue(validate([]))
    assertFalse(validate("a"))
    assertFalse(validate(1))
    assertFalse(validate(true))
  })

  it("empty struct: Schema.Struct({})", () => {
    const schema = Schema.Struct({})
    const jsonSchema: Root = {
      "$id": "/schemas/%7B%7D",
      "anyOf": [{
        "type": "object"
      }, {
        "type": "array"
      }]
    }
    expectJSONSchemaAnnotations(schema, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    assertTrue(validate({}))
    assertTrue(validate({ a: 1 }))
    assertTrue(validate([]))
    assertFalse(validate(null))
    assertFalse(validate(1))
    assertFalse(validate(true))
  })

  it("Void", () => {
    expectJSONSchemaAnnotations(Schema.Void, {
      "$id": "/schemas/void",
      "title": "void"
    })
  })

  it("String", () => {
    expectJSONSchemaAnnotations(Schema.String, {
      "type": "string"
    })
  })

  it("Number", () => {
    expectJSONSchema(Schema.Number, {
      "type": "number"
    })
  })

  it("JsonNumber", () => {
    expectJSONSchemaProperty(Schema.JsonNumber, {
      "$defs": {
        "JsonNumber": {
          "type": "number",
          "title": "finite",
          "description": "a finite number"
        }
      },
      "$ref": "#/$defs/JsonNumber"
    })
  })

  it("Boolean", () => {
    expectJSONSchemaAnnotations(Schema.Boolean, {
      "type": "boolean"
    })
  })

  it("TemplateLiteral", () => {
    const schema = Schema.TemplateLiteral(Schema.Literal("a"), Schema.Number)
    const jsonSchema: Root = {
      "type": "string",
      "pattern": "^a[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$",
      "title": "`a${number}`",
      "description": "a template literal"
    }
    expectJSONSchemaAnnotations(schema, jsonSchema)
    const validate = getAjvValidate(jsonSchema)
    assertTrue(validate("a1"))
    assertTrue(validate("a12"))
    assertFalse(validate("a"))
    assertFalse(validate("aa"))
  })

  describe("Literal", () => {
    it("null literal", () => {
      expectJSONSchemaAnnotations(Schema.Null, {
        "type": "null"
      })
      expectJSONSchemaProperty(Schema.Null.annotations({ identifier: "9b7d3b2b-3b3a-4741-8c4c-9cae776c47f6" }), {
        "$defs": {
          "9b7d3b2b-3b3a-4741-8c4c-9cae776c47f6": {
            "type": "null"
          }
        },
        "$ref": "#/$defs/9b7d3b2b-3b3a-4741-8c4c-9cae776c47f6"
      })
    })

    it("string literals", () => {
      expectJSONSchemaAnnotations(Schema.Literal("a"), {
        "type": "string",
        "enum": ["a"]
      })
      expectJSONSchemaAnnotations(Schema.Literal("a", "b"), {
        "type": "string",
        "enum": ["a", "b"]
      })
    })

    it("number literals", () => {
      expectJSONSchemaAnnotations(Schema.Literal(1), {
        "type": "number",
        "enum": [1]
      })
      expectJSONSchemaAnnotations(Schema.Literal(1, 2), {
        "type": "number",
        "enum": [1, 2]
      })
    })

    it("boolean literals", () => {
      expectJSONSchemaAnnotations(Schema.Literal(true), {
        "type": "boolean",
        "enum": [true]
      })
      expectJSONSchemaAnnotations(Schema.Literal(false), {
        "type": "boolean",
        "enum": [false]
      })
      expectJSONSchemaAnnotations(Schema.Literal(true, false), {
        "type": "boolean",
        "enum": [true, false]
      })
    })

    it("union of literals", () => {
      expectJSONSchemaAnnotations(Schema.Literal(1, true), {
        "anyOf": [
          { "type": "number", "enum": [1] },
          { "type": "boolean", "enum": [true] }
        ]
      })
    })
  })

  describe("Enums", () => {
    it("empty enum", () => {
      enum Empty {}
      const jsonSchema = expectJSONSchema(Schema.Enums(Empty), {
        "$id": "/schemas/never",
        "not": {}
      })
      const validate = getAjvValidate(jsonSchema)
      assertFalse(validate(1))
    })

    it("single enum", () => {
      enum Fruits {
        Apple
      }
      expectJSONSchemaAnnotations(Schema.Enums(Fruits), {
        "$comment": "/schemas/enums",
        "anyOf": [
          {
            "type": "number",
            "title": "Apple",
            "enum": [0]
          }
        ]
      })
    })

    it("numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchemaAnnotations(Schema.Enums(Fruits), {
        "$comment": "/schemas/enums",
        "anyOf": [
          {
            "type": "number",
            "title": "Apple",
            "enum": [0]
          },
          {
            "type": "number",
            "title": "Banana",
            "enum": [1]
          }
        ]
      })
    })

    it("string enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana"
      }
      expectJSONSchemaAnnotations(Schema.Enums(Fruits), {
        "$comment": "/schemas/enums",
        "anyOf": [
          {
            "type": "string",
            "title": "Apple",
            "enum": ["apple"]
          },
          {
            "type": "string",
            "title": "Banana",
            "enum": ["banana"]
          }
        ]
      })
    })

    it("mix of string/number enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      expectJSONSchemaAnnotations(Schema.Enums(Fruits), {
        "$comment": "/schemas/enums",
        "anyOf": [
          {
            "type": "string",
            "title": "Apple",
            "enum": ["apple"]
          },
          {
            "type": "string",
            "title": "Banana",
            "enum": ["banana"]
          },
          {
            "type": "number",
            "title": "Cantaloupe",
            "enum": [0]
          }
        ]
      })
    })

    it("const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      expectJSONSchemaAnnotations(Schema.Enums(Fruits), {
        "$comment": "/schemas/enums",
        "anyOf": [
          {
            "type": "string",
            "title": "Apple",
            "enum": ["apple"]
          },
          {
            "type": "string",
            "title": "Banana",
            "enum": ["banana"]
          },
          {
            "type": "number",
            "title": "Cantaloupe",
            "enum": [3]
          }
        ]
      })
    })
  })

  describe("Refinement", () => {
    it("itemsCount (Array)", () => {
      expectJSONSchemaAnnotations(Schema.Array(Schema.String).pipe(Schema.itemsCount(2)), {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "an array of exactly 2 item(s)",
        "title": "itemsCount(2)",
        "minItems": 2,
        "maxItems": 2
      })
    })

    it("itemsCount (NonEmptyArray)", () => {
      expectJSONSchemaAnnotations(Schema.NonEmptyArray(Schema.String).pipe(Schema.itemsCount(2)), {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "an array of exactly 2 item(s)",
        "title": "itemsCount(2)",
        "minItems": 2,
        "maxItems": 2
      })
    })

    it("minItems (Array)", () => {
      expectJSONSchemaAnnotations(Schema.Array(Schema.String).pipe(Schema.minItems(2)), {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "an array of at least 2 item(s)",
        "title": "minItems(2)",
        "minItems": 2
      })
    })

    it("minItems (NonEmptyArray)", () => {
      expectJSONSchemaAnnotations(Schema.NonEmptyArray(Schema.String).pipe(Schema.minItems(2)), {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "an array of at least 2 item(s)",
        "title": "minItems(2)",
        "minItems": 2
      })
    })

    it("maxItems (Array)", () => {
      expectJSONSchemaAnnotations(Schema.Array(Schema.String).pipe(Schema.maxItems(2)), {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "an array of at most 2 item(s)",
        "title": "maxItems(2)",
        "maxItems": 2
      })
    })

    it("maxItems (NonEmptyArray)", () => {
      expectJSONSchemaAnnotations(Schema.NonEmptyArray(Schema.String).pipe(Schema.maxItems(2)), {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "an array of at most 2 item(s)",
        "title": "maxItems(2)",
        "minItems": 1,
        "maxItems": 2
      })
    })

    it("minLength", () => {
      expectJSONSchemaAnnotations(Schema.String.pipe(Schema.minLength(1)), {
        "type": "string",
        "title": "minLength(1)",
        "description": "a string at least 1 character(s) long",
        "minLength": 1
      })
    })

    it("maxLength", () => {
      expectJSONSchemaAnnotations(Schema.String.pipe(Schema.maxLength(1)), {
        "type": "string",
        "title": "maxLength(1)",
        "description": "a string at most 1 character(s) long",
        "maxLength": 1
      })
    })

    it("length: number", () => {
      expectJSONSchemaAnnotations(Schema.String.pipe(Schema.length(1)), {
        "type": "string",
        "title": "length(1)",
        "description": "a single character",
        "maxLength": 1,
        "minLength": 1
      })
    })

    it("length: { min, max }", () => {
      expectJSONSchemaAnnotations(Schema.String.pipe(Schema.length({ min: 2, max: 4 })), {
        "type": "string",
        "title": "length({ min: 2, max: 4)",
        "description": "a string at least 2 character(s) and at most 4 character(s) long",
        "maxLength": 4,
        "minLength": 2
      })
    })

    it("greaterThan", () => {
      expectJSONSchemaAnnotations(JsonNumber.pipe(Schema.greaterThan(1)), {
        "type": "number",
        "title": "greaterThan(1)",
        "description": "a number greater than 1",
        "exclusiveMinimum": 1
      })
    })

    it("greaterThanOrEqualTo", () => {
      expectJSONSchemaAnnotations(JsonNumber.pipe(Schema.greaterThanOrEqualTo(1)), {
        "type": "number",
        "title": "greaterThanOrEqualTo(1)",
        "description": "a number greater than or equal to 1",
        "minimum": 1
      })
    })

    it("lessThan", () => {
      expectJSONSchemaAnnotations(JsonNumber.pipe(Schema.lessThan(1)), {
        "type": "number",
        "title": "lessThan(1)",
        "description": "a number less than 1",
        "exclusiveMaximum": 1
      })
    })

    it("lessThanOrEqualTo", () => {
      expectJSONSchemaAnnotations(JsonNumber.pipe(Schema.lessThanOrEqualTo(1)), {
        "type": "number",
        "title": "lessThanOrEqualTo(1)",
        "description": "a number less than or equal to 1",
        "maximum": 1
      })
    })

    it("pattern", () => {
      expectJSONSchemaAnnotations(Schema.String.pipe(Schema.pattern(/^abb+$/)), {
        "type": "string",
        "description": "a string matching the pattern ^abb+$",
        "pattern": "^abb+$"
      })
    })

    it("int", () => {
      expectJSONSchemaAnnotations(JsonNumber.pipe(Schema.int()), {
        "type": "integer",
        "title": "int",
        "description": "an integer"
      })
    })

    it("Trimmed", () => {
      const schema = Schema.Trimmed
      expectJSONSchemaProperty(schema, {
        "$defs": {
          "Trimmed": {
            "title": "trimmed",
            "description": "a string with no leading or trailing whitespace",
            "pattern": "^\\S[\\s\\S]*\\S$|^\\S$|^$",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Trimmed"
      })
    })

    it("Lowercased", () => {
      const schema = Schema.Lowercased
      expectJSONSchemaProperty(schema, {
        "$defs": {
          "Lowercased": {
            "title": "lowercased",
            "description": "a lowercase string",
            "pattern": "^[^A-Z]*$",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Lowercased"
      })
    })

    it("Uppercased", () => {
      const schema = Schema.Uppercased
      expectJSONSchemaProperty(schema, {
        "$defs": {
          "Uppercased": {
            "title": "uppercased",
            "description": "an uppercase string",
            "pattern": "^[^a-z]*$",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Uppercased"
      })
    })

    it("Capitalized", () => {
      const schema = Schema.Capitalized
      expectJSONSchemaProperty(schema, {
        "$defs": {
          "Capitalized": {
            "title": "capitalized",
            "description": "a capitalized string",
            "pattern": "^[^a-z]?.*$",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Capitalized"
      })
    })

    it("Uncapitalized", () => {
      const schema = Schema.Uncapitalized
      expectJSONSchemaProperty(schema, {
        "$defs": {
          "Uncapitalized": {
            "title": "uncapitalized",
            "description": "a uncapitalized string",
            "pattern": "^[^A-Z]?.*$",
            "type": "string"
          }
        },
        "$ref": "#/$defs/Uncapitalized"
      })
    })

    describe("should handle merge conflicts", () => {
      it("minLength + minLength", () => {
        expectJSONSchemaProperty(Schema.String.pipe(Schema.minLength(1), Schema.minLength(2)), {
          "type": "string",
          "title": "minLength(2)",
          "description": "a string at least 2 character(s) long",
          "minLength": 2
        })
        expectJSONSchemaProperty(Schema.String.pipe(Schema.minLength(2), Schema.minLength(1)), {
          "type": "string",
          "title": "minLength(1)",
          "description": "a string at least 1 character(s) long",
          "minLength": 1,
          "allOf": [
            { "minLength": 2 }
          ]
        })
        expectJSONSchemaProperty(Schema.String.pipe(Schema.minLength(2), Schema.minLength(1), Schema.minLength(2)), {
          "type": "string",
          "title": "minLength(2)",
          "description": "a string at least 2 character(s) long",
          "minLength": 2
        })
      })

      it("maxLength + maxLength", () => {
        expectJSONSchemaProperty(Schema.String.pipe(Schema.maxLength(1), Schema.maxLength(2)), {
          "type": "string",
          "title": "maxLength(2)",
          "description": "a string at most 2 character(s) long",
          "maxLength": 2,
          "allOf": [
            { "maxLength": 1 }
          ]
        })
        expectJSONSchemaProperty(Schema.String.pipe(Schema.maxLength(2), Schema.maxLength(1)), {
          "type": "string",
          "title": "maxLength(1)",
          "description": "a string at most 1 character(s) long",
          "maxLength": 1
        })
        expectJSONSchemaProperty(Schema.String.pipe(Schema.maxLength(1), Schema.maxLength(2), Schema.maxLength(1)), {
          "type": "string",
          "title": "maxLength(1)",
          "description": "a string at most 1 character(s) long",
          "maxLength": 1
        })
      })

      it("pattern + pattern", () => {
        expectJSONSchemaProperty(Schema.String.pipe(Schema.startsWith("a"), Schema.endsWith("c")), {
          "type": "string",
          "title": "endsWith(\"c\")",
          "description": "a string ending with \"c\"",
          "pattern": "^.*c$",
          "allOf": [
            { "pattern": "^a" }
          ]
        })
        expectJSONSchemaProperty(
          Schema.String.pipe(Schema.startsWith("a"), Schema.endsWith("c"), Schema.startsWith("a")),
          {
            "type": "string",
            "title": "startsWith(\"a\")",
            "description": "a string starting with \"a\"",
            "pattern": "^a",
            "allOf": [
              { "pattern": "^.*c$" }
            ]
          }
        )
        expectJSONSchemaProperty(
          Schema.String.pipe(Schema.endsWith("c"), Schema.startsWith("a"), Schema.endsWith("c")),
          {
            "type": "string",
            "title": "endsWith(\"c\")",
            "description": "a string ending with \"c\"",
            "pattern": "^.*c$",
            "allOf": [
              { "pattern": "^a" }
            ]
          }
        )
      })

      it("minItems + minItems", () => {
        expectJSONSchemaProperty(Schema.Array(Schema.String).pipe(Schema.minItems(1), Schema.minItems(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "an array of at least 2 item(s)",
          "title": "minItems(2)",
          "minItems": 2
        })
        expectJSONSchemaProperty(Schema.Array(Schema.String).pipe(Schema.minItems(2), Schema.minItems(1)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "title": "minItems(1)",
          "description": "an array of at least 1 item(s)",
          "minItems": 1,
          "allOf": [
            { "minItems": 2 }
          ]
        })
        expectJSONSchemaProperty(
          Schema.Array(Schema.String).pipe(Schema.minItems(2), Schema.minItems(1), Schema.minItems(2)),
          {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "an array of at least 2 item(s)",
            "title": "minItems(2)",
            "minItems": 2
          }
        )
      })

      it("maxItems + maxItems", () => {
        expectJSONSchemaProperty(Schema.Array(Schema.String).pipe(Schema.maxItems(1), Schema.maxItems(2)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "title": "maxItems(2)",
          "description": "an array of at most 2 item(s)",
          "maxItems": 2,
          "allOf": [
            { "maxItems": 1 }
          ]
        })
        expectJSONSchemaProperty(Schema.Array(Schema.String).pipe(Schema.maxItems(2), Schema.maxItems(1)), {
          "type": "array",
          "items": {
            "type": "string"
          },
          "title": "maxItems(1)",
          "description": "an array of at most 1 item(s)",
          "maxItems": 1
        })
        expectJSONSchemaProperty(
          Schema.Array(Schema.String).pipe(Schema.maxItems(1), Schema.maxItems(2), Schema.maxItems(1)),
          {
            "type": "array",
            "items": {
              "type": "string"
            },
            "title": "maxItems(1)",
            "description": "an array of at most 1 item(s)",
            "maxItems": 1
          }
        )
      })

      it("minimum + minimum", () => {
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.greaterThanOrEqualTo(1), Schema.greaterThanOrEqualTo(2)), {
          "type": "number",
          "title": "greaterThanOrEqualTo(2)",
          "description": "a number greater than or equal to 2",
          "minimum": 2
        })
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.greaterThanOrEqualTo(2), Schema.greaterThanOrEqualTo(1)), {
          "type": "number",
          "minimum": 1,
          "title": "greaterThanOrEqualTo(1)",
          "description": "a number greater than or equal to 1",
          "allOf": [
            { "minimum": 2 }
          ]
        })
        expectJSONSchemaProperty(
          JsonNumber.pipe(
            Schema.greaterThanOrEqualTo(2),
            Schema.greaterThanOrEqualTo(1),
            Schema.greaterThanOrEqualTo(2)
          ),
          {
            "type": "number",
            "title": "greaterThanOrEqualTo(2)",
            "description": "a number greater than or equal to 2",
            "minimum": 2
          }
        )
      })

      it("maximum + maximum", () => {
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.lessThanOrEqualTo(1), Schema.lessThanOrEqualTo(2)), {
          "type": "number",
          "title": "lessThanOrEqualTo(2)",
          "description": "a number less than or equal to 2",
          "maximum": 2,
          "allOf": [
            { "maximum": 1 }
          ]
        })
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.lessThanOrEqualTo(2), Schema.lessThanOrEqualTo(1)), {
          "type": "number",
          "title": "lessThanOrEqualTo(1)",
          "description": "a number less than or equal to 1",
          "maximum": 1
        })
        expectJSONSchemaProperty(
          JsonNumber.pipe(Schema.lessThanOrEqualTo(1), Schema.lessThanOrEqualTo(2), Schema.lessThanOrEqualTo(1)),
          {
            "type": "number",
            "title": "lessThanOrEqualTo(1)",
            "description": "a number less than or equal to 1",
            "maximum": 1
          }
        )
      })

      it("exclusiveMinimum + exclusiveMinimum", () => {
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.greaterThan(1), Schema.greaterThan(2)), {
          "type": "number",
          "title": "greaterThan(2)",
          "description": "a number greater than 2",
          "exclusiveMinimum": 2
        })
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.greaterThan(2), Schema.greaterThan(1)), {
          "type": "number",
          "exclusiveMinimum": 1,
          "title": "greaterThan(1)",
          "description": "a number greater than 1",
          "allOf": [
            { "exclusiveMinimum": 2 }
          ]
        })
        expectJSONSchemaProperty(
          JsonNumber.pipe(
            Schema.greaterThan(2),
            Schema.greaterThan(1),
            Schema.greaterThan(2)
          ),
          {
            "type": "number",
            "title": "greaterThan(2)",
            "description": "a number greater than 2",
            "exclusiveMinimum": 2
          }
        )
      })

      it("exclusiveMaximum + exclusiveMaximum", () => {
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.lessThan(1), Schema.lessThan(2)), {
          "type": "number",
          "title": "lessThan(2)",
          "description": "a number less than 2",
          "exclusiveMaximum": 2,
          "allOf": [
            { "exclusiveMaximum": 1 }
          ]
        })
        expectJSONSchemaProperty(JsonNumber.pipe(Schema.lessThan(2), Schema.lessThan(1)), {
          "type": "number",
          "title": "lessThan(1)",
          "description": "a number less than 1",
          "exclusiveMaximum": 1
        })
        expectJSONSchemaProperty(
          JsonNumber.pipe(Schema.lessThan(1), Schema.lessThan(2), Schema.lessThan(1)),
          {
            "type": "number",
            "title": "lessThan(1)",
            "description": "a number less than 1",
            "exclusiveMaximum": 1
          }
        )
      })

      it("multipleOf + multipleOf", () => {
        expectJSONSchema(JsonNumber.pipe(Schema.multipleOf(2), Schema.multipleOf(3)), {
          "type": "number",
          "title": "multipleOf(3)",
          "description": "a number divisible by 3",
          "multipleOf": 3,
          "allOf": [
            { "multipleOf": 2 }
          ]
        })
        expectJSONSchema(
          JsonNumber.pipe(Schema.multipleOf(2), Schema.multipleOf(3), Schema.multipleOf(3)),
          {
            "type": "number",
            "title": "multipleOf(3)",
            "description": "a number divisible by 3",
            "multipleOf": 3,
            "allOf": [
              { "multipleOf": 2 }
            ]
          }
        )
        expectJSONSchema(
          JsonNumber.pipe(Schema.multipleOf(3), Schema.multipleOf(2), Schema.multipleOf(3)),
          {
            "type": "number",
            "title": "multipleOf(3)",
            "description": "a number divisible by 3",
            "multipleOf": 3,
            "allOf": [
              { "multipleOf": 2 }
            ]
          }
        )
      })
    })
  })

  describe("Tuple", () => {
    it("empty tuple", () => {
      const schema = Schema.Tuple()
      const jsonSchema: Root = {
        "type": "array",
        "maxItems": 0
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate([]))
      assertFalse(validate([1]))
    })

    it("element", () => {
      const schema = Schema.Tuple(JsonNumber)
      const jsonSchema: Root = {
        "type": "array",
        "items": [{
          "type": "number"
        }],
        "minItems": 1,
        "additionalItems": false
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate([1]))
      assertFalse(validate([]))
      assertFalse(validate(["a"]))
      assertFalse(validate([1, "a"]))
    })

    it("element + inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Tuple(JsonNumber.annotations({ description: "inner" })),
        {
          "type": "array",
          "items": [{
            "type": "number",
            "description": "inner"
          }],
          "minItems": 1,
          "additionalItems": false
        }
      )
    })

    it("element + outer annotations should override inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Tuple(
          Schema.element(JsonNumber.annotations({ description: "inner" })).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "items": [{
            "type": "number",
            "description": "outer"
          }],
          "minItems": 1,
          "additionalItems": false
        }
      )
    })

    it("optionalElement", () => {
      const schema = Schema.Tuple(Schema.optionalElement(JsonNumber))
      const jsonSchema: Root = {
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "number"
          }
        ],
        "additionalItems": false
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate([]))
      assertTrue(validate([1]))
      assertFalse(validate(["a"]))
      assertFalse(validate([1, 2]))
    })

    it("optionalElement + inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Tuple(Schema.optionalElement(JsonNumber).annotations({ description: "inner" })),
        {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "number",
              "description": "inner"
            }
          ],
          "additionalItems": false
        }
      )
    })

    it("optionalElement + outer annotations should override inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Tuple(
          Schema.optionalElement(JsonNumber).annotations({ description: "inner" }).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "number",
              "description": "outer"
            }
          ],
          "additionalItems": false
        }
      )
    })

    it("element + optionalElement", () => {
      const schema = Schema.Tuple(
        Schema.element(Schema.String.annotations({ description: "inner" })).annotations({ description: "outer" }),
        Schema.optionalElement(JsonNumber.annotations({ description: "inner?" })).annotations({
          description: "outer?"
        })
      )
      const jsonSchema: Root = {
        "type": "array",
        "minItems": 1,
        "items": [
          {
            "type": "string",
            "description": "outer"
          },
          {
            "type": "number",
            "description": "outer?"
          }
        ],
        "additionalItems": false
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate(["a"]))
      assertTrue(validate(["a", 1]))
      assertFalse(validate([]))
      assertFalse(validate([1]))
      assertFalse(validate([1, 2]))
    })

    it("rest", () => {
      const schema = Schema.Array(JsonNumber)
      const jsonSchema: Root = {
        "type": "array",
        "items": {
          "type": "number"
        }
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate([]))
      assertTrue(validate([1]))
      assertTrue(validate([1, 2]))
      assertTrue(validate([1, 2, 3]))
      assertFalse(validate(["a"]))
      assertFalse(validate([1, 2, 3, "a"]))
    })

    it("rest + inner annotations", () => {
      expectJSONSchemaAnnotations(Schema.Array(JsonNumber.annotations({ description: "inner" })), {
        "type": "array",
        "items": {
          "type": "number",
          "description": "inner"
        }
      })
    })

    it("optionalElement + rest + inner annotations", () => {
      const schema = Schema.Tuple(
        [Schema.optionalElement(Schema.String)],
        Schema.element(JsonNumber.annotations({ description: "inner" }))
      )
      const jsonSchema: Root = {
        "type": "array",
        "minItems": 0,
        "items": [
          {
            "type": "string"
          }
        ],
        "additionalItems": {
          "type": "number",
          "description": "inner"
        }
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate([]))
      assertTrue(validate(["a"]))
      assertTrue(validate(["a", 1]))
      assertFalse(validate([1]))
      assertFalse(validate([1, 2]))
      assertFalse(validate(["a", "b", 1]))
    })

    it("optionalElement + rest + outer annotations should override inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Tuple(
          [Schema.optionalElement(Schema.String)],
          Schema.element(JsonNumber.annotations({ description: "inner" })).annotations({ description: "outer" })
        ),
        {
          "type": "array",
          "minItems": 0,
          "items": [
            {
              "type": "string"
            }
          ],
          "additionalItems": {
            "type": "number",
            "description": "outer"
          }
        }
      )
    })

    it("element + rest", () => {
      const schema = Schema.Tuple([Schema.String], JsonNumber)
      const jsonSchema: Root = {
        "type": "array",
        "items": [{
          "type": "string"
        }],
        "minItems": 1,
        "additionalItems": {
          "type": "number"
        }
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate(["a"]))
      assertTrue(validate(["a", 1]))
      assertTrue(validate(["a", 1, 2]))
      assertTrue(validate(["a", 1, 2, 3]))
      assertFalse(validate([]))
      assertFalse(validate([1]))
      assertFalse(validate(["a", "b"]))
    })

    it("NonEmptyArray", () => {
      expectJSONSchemaProperty(
        Schema.NonEmptyArray(Schema.String),
        {
          type: "array",
          minItems: 1,
          items: { type: "string" }
        }
      )
    })
  })

  describe("Struct", () => {
    it("Baseline", () => {
      const schema = Schema.Struct({
        a: Schema.String,
        b: JsonNumber
      })
      const jsonSchema: Root = {
        "type": "object",
        "properties": {
          "a": { "type": "string" },
          "b": { "type": "number" }
        },
        "required": ["a", "b"],
        "additionalProperties": false
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({ a: "a", b: 1 }))
      assertFalse(validate({}))
      assertFalse(validate({ a: "a" }))
      assertFalse(validate({ b: 1 }))
      assertFalse(validate({ a: "a", b: 1, c: true }))
    })

    it("field + inner annotation", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.String.annotations({ description: "inner" })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "required": ["a"],
          "additionalProperties": false
        }
      )
    })

    it("field + outer annotation should override inner annotation", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.propertySignature(Schema.String.annotations({ description: "inner" })).annotations({
            description: "outer"
          })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "required": ["a"],
          "additionalProperties": false
        }
      )
    })

    it("Struct + Record", () => {
      const schema = Schema.Struct({
        a: Schema.String
      }, Schema.Record({ key: Schema.String, value: Schema.String }))
      const jsonSchema: Root = {
        "type": "object",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "type": "string"
          }
        },
        "additionalProperties": {
          "type": "string"
        }
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({ a: "a" }))
      assertTrue(validate({ a: "a", b: "b" }))
      assertFalse(validate({}))
      assertFalse(validate({ b: "b" }))
      assertFalse(validate({ a: 1 }))
      assertFalse(validate({ a: "a", b: 1 }))
    })

    it("exact optional field", () => {
      const schema = Schema.Struct({
        a: Schema.String,
        b: Schema.optionalWith(JsonNumber, { exact: true })
      })
      const jsonSchema: Root = {
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          },
          "b": {
            "type": "number"
          }
        },
        "required": ["a"],
        "additionalProperties": false
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({ a: "a", b: 1 }))
      assertTrue(validate({ a: "a" }))
      assertFalse(validate({}))
      assertFalse(validate({ b: 1 }))
      assertFalse(validate({ a: "a", b: 1, c: true }))
    })

    it("exact optional field + inner annotation", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String.annotations({ description: "inner" }), { exact: true })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "required": [],
          "additionalProperties": false
        }
      )
    })

    it("exact optional field + outer annotation should override inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.optionalWith(Schema.String.annotations({ description: "inner" }), { exact: true }).annotations({
            description: "outer"
          })
        }),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "required": [],
          "additionalProperties": false
        }
      )
    })
  })

  describe("Record", () => {
    it("Record(refinement, number)", () => {
      expectJSONSchemaAnnotations(
        Schema.Record({ key: Schema.String.pipe(Schema.minLength(1)), value: JsonNumber }),
        {
          "type": "object",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": {
              "type": "number"
            }
          },
          "propertyNames": {
            "type": "string",
            "title": "minLength(1)",
            "description": "a string at least 1 character(s) long",
            "minLength": 1
          }
        }
      )
    })

    it("Record(string, number)", () => {
      expectJSONSchemaAnnotations(Schema.Record({ key: Schema.String, value: JsonNumber }), {
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": {
          "type": "number"
        }
      })
    })

    it("Record('a' | 'b', number)", () => {
      expectJSONSchemaAnnotations(
        Schema.Record(
          { key: Schema.Union(Schema.Literal("a"), Schema.Literal("b")), value: JsonNumber }
        ),
        {
          "type": "object",
          "properties": {
            "a": {
              "type": "number"
            },
            "b": {
              "type": "number"
            }
          },
          "required": ["a", "b"],
          "additionalProperties": false
        }
      )
    })

    it("Record(${string}-${string}, number)", () => {
      const schema = Schema.Record(
        { key: Schema.TemplateLiteral(Schema.String, Schema.Literal("-"), Schema.String), value: JsonNumber }
      )
      const jsonSchema: Root = {
        "type": "object",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": { "type": "number" }
        },
        "propertyNames": {
          "pattern": "^[\\s\\S]*?-[\\s\\S]*?$",
          "type": "string"
        }
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({}))
      assertTrue(validate({ "-": 1 }))
      assertTrue(validate({ "a-": 1 }))
      assertTrue(validate({ "-b": 1 }))
      assertTrue(validate({ "a-b": 1 }))
      assertFalse(validate({ "": 1 }))
      assertFalse(validate({ "-": "a" }))
    })

    it("Record(pattern, number)", () => {
      const schema = Schema.Record(
        { key: Schema.String.pipe(Schema.pattern(new RegExp("^.*-.*$"))), value: JsonNumber }
      )
      const jsonSchema: Root = {
        "type": "object",
        "required": [],
        "properties": {},
        "patternProperties": {
          "": {
            "type": "number"
          }
        },
        "propertyNames": {
          "description": "a string matching the pattern ^.*-.*$",
          "pattern": "^.*-.*$",
          "type": "string"
        }
      }
      expectJSONSchemaAnnotations(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({}))
      assertTrue(validate({ "-": 1 }))
      assertTrue(validate({ "a-": 1 }))
      assertTrue(validate({ "-b": 1 }))
      assertTrue(validate({ "a-b": 1 }))
      assertFalse(validate({ "": 1 }))
      assertFalse(validate({ "-": "a" }))
    })

    it("Record(SymbolFromSelf & annotation, number)", () => {
      expectJSONSchemaAnnotations(
        Schema.Record({
          key: Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "string" } }),
          value: JsonNumber
        }),
        {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "required": [],
          "properties": {},
          "additionalProperties": {
            "type": "number"
          },
          "propertyNames": {
            "type": "string"
          }
        }
      )
    })

    it("Record(string, UndefinedOr(number))", () => {
      expectJSONSchemaAnnotations(Schema.Record({ key: Schema.String, value: Schema.UndefinedOr(JsonNumber) }), {
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": { "type": "number" }
      })
    })

    it("partial(Struct + Record(string, number))", () => {
      const schema = Schema.partial(
        Schema.Struct(
          { foo: Schema.Number },
          {
            key: Schema.String,
            value: Schema.Number
          }
        )
      )

      expectJSONSchemaAnnotations(schema, {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": [],
        "properties": {
          "foo": {
            "type": "number"
          }
        },
        "additionalProperties": {
          "type": "number"
        }
      })
    })
  })

  describe("Union", () => {
    it("should ignore never members", () => {
      expectJSONSchema(Schema.Union(Schema.String, Schema.Never), {
        "type": "string"
      })
      expectJSONSchema(Schema.Union(Schema.String, Schema.Union(Schema.Never, Schema.Never)), {
        "type": "string"
      })
    })

    it("string | JsonNumber", () => {
      expectJSONSchemaAnnotations(Schema.Union(Schema.String, JsonNumber), {
        "anyOf": [
          { "type": "string" },
          { "type": "number" }
        ]
      })
    })

    describe("Union including literals", () => {
      it(`1 | 2`, () => {
        expectJSONSchemaAnnotations(Schema.Union(Schema.Literal(1), Schema.Literal(2)), {
          "type": "number",
          "enum": [1, 2]
        })
      })

      it(`1(with description) | 2`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1).annotations({ description: "43d87cd1-df64-457f-8119-0401ecd1399e" }),
            Schema.Literal(2)
          ),
          {
            "anyOf": [
              {
                "type": "number",
                "enum": [1],
                "description": "43d87cd1-df64-457f-8119-0401ecd1399e"
              },
              {
                "type": "number",
                "enum": [2]
              }
            ]
          }
        )
      })

      it(`1 | 2(with description)`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1),
            Schema.Literal(2).annotations({ description: "28e1ba58-7c13-4667-88cb-2baa1ac31a0f" })
          ),
          {
            "anyOf": [
              {
                "type": "number",
                "enum": [1]
              },
              {
                "type": "number",
                "enum": [2],
                "description": "28e1ba58-7c13-4667-88cb-2baa1ac31a0f"
              }
            ]
          }
        )
      })

      it(`1 | 2 | string`, () => {
        expectJSONSchemaAnnotations(Schema.Union(Schema.Literal(1), Schema.Literal(2), Schema.String), {
          "anyOf": [
            {
              "type": "number",
              "enum": [1, 2]
            },
            { "type": "string" }
          ]
        })
      })

      it(`(1 | 2) | string`, () => {
        expectJSONSchemaAnnotations(Schema.Union(Schema.Literal(1, 2), Schema.String), {
          "anyOf": [
            {
              "type": "number",
              "enum": [1, 2]
            },
            { "type": "string" }
          ]
        })
      })

      it(`(1 | 2)(with description) | string`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1, 2).annotations({ description: "d0121d0e-8b56-4a2e-9963-47a0965d6a3c" }),
            Schema.String
          ),
          {
            "anyOf": [
              {
                "type": "number",
                "description": "d0121d0e-8b56-4a2e-9963-47a0965d6a3c",
                "enum": [1, 2]
              },
              { "type": "string" }
            ]
          }
        )
      })

      it(`(1 | 2)(with description) | 3 | string`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1, 2).annotations({ description: "eca4431f-c97c-454f-8167-6c2e81430c6b" }),
            Schema.Literal(3),
            Schema.String
          ),
          {
            "anyOf": [
              {
                "type": "number",
                "description": "eca4431f-c97c-454f-8167-6c2e81430c6b",
                "enum": [1, 2]
              },
              {
                "type": "number",
                "enum": [3]
              },
              { "type": "string" }
            ]
          }
        )
      })

      it(`1(with description) | 2 | string`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1).annotations({ description: "867c07f5-5710-477c-8296-239694e86562" }),
            Schema.Literal(2),
            Schema.String
          ),
          {
            "anyOf": [
              {
                "type": "number",
                "description": "867c07f5-5710-477c-8296-239694e86562",
                "enum": [1]
              },
              {
                "type": "number",
                "enum": [2]
              },
              { "type": "string" }
            ]
          }
        )
      })

      it(`1 | 2(with description) | string`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal(1),
            Schema.Literal(2).annotations({ description: "4e49a840-5fb8-43f6-916f-565cbf532db4" }),
            Schema.String
          ),
          {
            "anyOf": [
              {
                "type": "number",
                "enum": [1]
              },
              {
                "type": "number",
                "description": "4e49a840-5fb8-43f6-916f-565cbf532db4",
                "enum": [2]
              },
              { "type": "string" }
            ]
          }
        )
      })

      it(`string | 1 | 2 `, () => {
        expectJSONSchemaAnnotations(Schema.Union(Schema.String, Schema.Literal(1), Schema.Literal(2)), {
          "anyOf": [
            { "type": "string" },
            {
              "type": "number",
              "enum": [1, 2]
            }
          ]
        })
      })

      it(`string | (1 | 2) `, () => {
        expectJSONSchemaAnnotations(Schema.Union(Schema.String, Schema.Literal(1, 2)), {
          "anyOf": [
            { "type": "string" },
            {
              "type": "number",
              "enum": [1, 2]
            }
          ]
        })
      })

      it(`string | 1(with description) | 2`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.String,
            Schema.Literal(1).annotations({ description: "26521e57-cfb6-4563-abe2-2fe920398e16" }),
            Schema.Literal(2)
          ),
          {
            "anyOf": [
              { "type": "string" },
              {
                "type": "number",
                "description": "26521e57-cfb6-4563-abe2-2fe920398e16",
                "enum": [1]
              },
              {
                "type": "number",
                "enum": [2]
              }
            ]
          }
        )
      })

      it(`string | 1 | 2(with description)`, () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.String,
            Schema.Literal(1),
            Schema.Literal(2).annotations({ description: "c4fb2a01-68ff-43d2-81d0-de799c06e9c0" })
          ),
          {
            "anyOf": [
              { "type": "string" },
              {
                "type": "number",
                "enum": [1]
              },
              {
                "type": "number",
                "description": "c4fb2a01-68ff-43d2-81d0-de799c06e9c0",
                "enum": [2]
              }
            ]
          }
        )
      })
    })
  })

  describe("Transformation", () => {
    it("NumberFromString", () => {
      expectJSONSchemaProperty(Schema.NumberFromString, {
        "$defs": {
          "NumberFromString": {
            "type": "string",
            "description": "a string to be decoded into a number"
          }
        },
        "$ref": "#/$defs/NumberFromString"
      })
    })

    it("DateFromString", () => {
      expectJSONSchemaProperty(
        Schema.DateFromString,
        {
          "$defs": {
            "DateFromString": {
              "type": "string",
              "description": "a string to be decoded into a Date"
            }
          },
          "$ref": "#/$defs/DateFromString"
        }
      )
    })

    it("Date", () => {
      expectJSONSchemaProperty(
        Schema.Date,
        {
          "$defs": {
            "Date": {
              "type": "string",
              "description": "a string to be decoded into a Date"
            }
          },
          "$ref": "#/$defs/Date"
        }
      )
    })

    it("OptionFromNullOr", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.OptionFromNullOr(Schema.NonEmptyString)
        }),
        {
          "$defs": {
            "NonEmptyString": {
              "type": "string",
              "title": "nonEmptyString",
              "description": "a non empty string",
              "minLength": 1
            }
          },
          "type": "object",
          "required": [
            "a"
          ],
          "properties": {
            "a": {
              "anyOf": [
                { "$ref": "#/$defs/NonEmptyString" },
                { "type": "null" }
              ]
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("ReadonlyMapFromRecord", () => {
      expectJSONSchemaProperty(
        Schema.ReadonlyMapFromRecord({
          key: Schema.String.pipe(Schema.minLength(2)),
          value: Schema.NumberFromString
        }),
        {
          "$defs": {
            "NumberFromString": {
              "type": "string",
              "description": "a string to be decoded into a number"
            }
          },
          "type": "object",
          "description": "a record to be decoded into a ReadonlyMap",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": {
              "$ref": "#/$defs/NumberFromString"
            }
          },
          "propertyNames": {
            "title": "minLength(2)",
            "description": "a string at least 2 character(s) long",
            "minLength": 2,
            "type": "string"
          }
        }
      )
    })

    it("MapFromRecord", () => {
      expectJSONSchemaProperty(
        Schema.MapFromRecord({
          key: Schema.String.pipe(Schema.minLength(2)),
          value: Schema.NumberFromString
        }),
        {
          "$defs": {
            "NumberFromString": {
              "type": "string",
              "description": "a string to be decoded into a number"
            }
          },
          "type": "object",
          "description": "a record to be decoded into a Map",
          "required": [],
          "properties": {},
          "patternProperties": {
            "": {
              "$ref": "#/$defs/NumberFromString"
            }
          },
          "propertyNames": {
            "title": "minLength(2)",
            "description": "a string at least 2 character(s) long",
            "minLength": 2,
            "type": "string"
          }
        }
      )
    })

    describe("TypeLiteralTransformation", () => {
      // not sure if this is a bug or not
      it.skip("a title annotation on the transformation should not overwrite an annotation set on the from part", () => {
        const schema = Schema.make(
          new AST.Transformation(
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.TitleAnnotationId]: "from-title"
            }),
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.TitleAnnotationId]: "to-title"
            }),
            new AST.TypeLiteralTransformation([]),
            { [AST.TitleAnnotationId]: "transformation-title" }
          )
        )
        expectJSONSchemaProperty(schema, {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false,
          "title": "from-title"
        })
      })

      // not sure if this is a bug or not
      it.skip("a description annotation on the transformation should not overwrite an annotation set on the from part", () => {
        const schema = Schema.make(
          new AST.Transformation(
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.DescriptionAnnotationId]: "from-description"
            }),
            new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
              [AST.DescriptionAnnotationId]: "to-description"
            }),
            new AST.TypeLiteralTransformation([]),
            { [AST.DescriptionAnnotationId]: "transformation-description" }
          )
        )
        expectJSONSchemaProperty(schema, {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false,
          "description": "from-description"
        })
      })

      describe("optionalWith", () => {
        describe(`{ default: () => ... } option`, () => {
          it("with transformation description and title", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(
                  Schema.NonEmptyString.annotations({
                    description: "inner-description",
                    title: "inner-title"
                  }),
                  { default: () => "" }
                ).annotations({
                  description: "middle-description",
                  title: "middle-title"
                })
              }).annotations({
                description: "outer-description",
                title: "outer-title"
              }),
              {
                "type": "object",
                "description": "outer-description",
                "title": "outer-title",
                "required": [],
                "properties": {
                  "a": {
                    "description": "middle-description",
                    "minLength": 1,
                    "title": "middle-title",
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            )
          })
        })

        describe(`{ as: "Option" } option`, () => {
          it("base", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
              }),
              {
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "title": "nonEmptyString",
                    "description": "a non empty string",
                    "minLength": 1
                  }
                },
                "type": "object",
                "required": [],
                "properties": {
                  "a": {
                    "$ref": "#/$defs/NonEmptyString"
                  }
                },
                "additionalProperties": false
              }
            )
          })

          it("with transformation identifier annotation", () => {
            expectJSONSchemaProperty(
              Schema.Struct({
                a: Schema.optionalWith(Schema.NonEmptyString, { as: "Option" })
              }).annotations({
                identifier: "aa6f48cd-03e4-470a-beb7-5f7cc532c676",
                description: "b964b873-0266-446b-acf4-97dc125e7553",
                title: "aa67b73c-3161-4640-b1e1-5b5830cfb173"
              }),
              {
                "$ref": "#/$defs/aa6f48cd-03e4-470a-beb7-5f7cc532c676",
                "$defs": {
                  "NonEmptyString": {
                    "type": "string",
                    "title": "nonEmptyString",
                    "description": "a non empty string",
                    "minLength": 1
                  },
                  "aa6f48cd-03e4-470a-beb7-5f7cc532c676": {
                    "type": "object",
                    "required": [],
                    "properties": {
                      "a": {
                        "$ref": "#/$defs/NonEmptyString"
                      }
                    },
                    "additionalProperties": false,
                    "description": "b964b873-0266-446b-acf4-97dc125e7553",
                    "title": "aa67b73c-3161-4640-b1e1-5b5830cfb173"
                  }
                }
              }
            )
          })
        })
      })

      describe("fromKey", () => {
        it("a <- b", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
            }),
            {
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "title": "nonEmptyString",
                  "description": "a non empty string",
                  "minLength": 1
                }
              },
              "type": "object",
              "required": [
                "b"
              ],
              "properties": {
                "b": {
                  "$ref": "#/$defs/NonEmptyString"
                }
              },
              "additionalProperties": false
            }
          )
        })

        it("a <- b & annotations", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b")).annotations({})
            }),
            {
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "title": "nonEmptyString",
                  "description": "a non empty string",
                  "minLength": 1
                }
              },
              "type": "object",
              "required": [
                "b"
              ],
              "properties": {
                "b": {
                  "$ref": "#/$defs/NonEmptyString"
                }
              },
              "additionalProperties": false
            }
          )
        })

        it("with transformation identifier annotation", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.NonEmptyString.pipe(Schema.propertySignature, Schema.fromKey("b"))
            }).annotations({
              identifier: "d5ff7bc8-1bd5-42a7-8186-e29fd4c217ea",
              description: "5f7bc5b8-dd68-4ec5-b9e9-64df74bd3c45",
              title: "119da226-70aa-4ae6-ab63-7db10c7e9dde"
            }),
            {
              "$ref": "#/$defs/d5ff7bc8-1bd5-42a7-8186-e29fd4c217ea",
              "$defs": {
                "NonEmptyString": {
                  "type": "string",
                  "title": "nonEmptyString",
                  "description": "a non empty string",
                  "minLength": 1
                },
                "d5ff7bc8-1bd5-42a7-8186-e29fd4c217ea": {
                  "type": "object",
                  "required": [
                    "b"
                  ],
                  "properties": {
                    "b": {
                      "$ref": "#/$defs/NonEmptyString"
                    }
                  },
                  "additionalProperties": false,
                  "description": "5f7bc5b8-dd68-4ec5-b9e9-64df74bd3c45",
                  "title": "119da226-70aa-4ae6-ab63-7db10c7e9dde"
                }
              }
            }
          )
        })
      })
    })
  })

  describe("Suspend", () => {
    it("should support outer suspended schemas", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: Schema.Schema<A> = Schema.suspend(() =>
        // intended outer suspend
        Schema.Struct({
          a: Schema.String,
          as: Schema.Array(schema)
        })
      ).annotations({ identifier: "cdb51157-6f4a-42c1-9075-5b9af3a1448c" })
      const jsonSchema: Root = {
        "$ref": "#/$defs/cdb51157-6f4a-42c1-9075-5b9af3a1448c",
        "$defs": {
          "cdb51157-6f4a-42c1-9075-5b9af3a1448c": {
            "type": "object",
            "required": [
              "a",
              "as"
            ],
            "properties": {
              "a": {
                "type": "string"
              },
              "as": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/cdb51157-6f4a-42c1-9075-5b9af3a1448c"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({ a: "a1", as: [] }))
      assertTrue(validate({ a: "a1", as: [{ a: "a2", as: [] }] }))
      assertTrue(validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [] }] }))
      assertTrue(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] })
      )
      assertFalse(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [1] }] }] })
      )
    })

    it("should support inner suspended schemas with inner identifier annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(
          Schema.suspend((): Schema.Schema<A> => schema).annotations({
            identifier: "c4588a13-c003-4b8d-930f-d3469925ec1b"
          })
        )
      })
      const jsonSchema: Root = {
        "type": "object",
        "required": [
          "a",
          "as"
        ],
        "properties": {
          "a": {
            "type": "string"
          },
          "as": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/c4588a13-c003-4b8d-930f-d3469925ec1b"
            }
          }
        },
        "additionalProperties": false,
        "$defs": {
          "c4588a13-c003-4b8d-930f-d3469925ec1b": {
            "type": "object",
            "required": [
              "a",
              "as"
            ],
            "properties": {
              "a": {
                "type": "string"
              },
              "as": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/c4588a13-c003-4b8d-930f-d3469925ec1b"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({ a: "a1", as: [] }))
      assertTrue(validate({ a: "a1", as: [{ a: "a2", as: [] }] }))
      assertTrue(validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [] }] }))
      assertTrue(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] })
      )
      assertFalse(
        validate({ a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [1] }] }] })
      )
    })

    it("should support inner suspended schemas with outer identifier annotation", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const schema = Schema.Struct({
        name: Schema.String,
        categories: Schema.Array(Schema.suspend((): Schema.Schema<Category> => schema))
      }).annotations({ identifier: "5c2a4755-f8f2-4290-a40f-ed247803a1a0" })
      const jsonSchema: Root = {
        "$ref": "#/$defs/5c2a4755-f8f2-4290-a40f-ed247803a1a0",
        "$defs": {
          "5c2a4755-f8f2-4290-a40f-ed247803a1a0": {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/5c2a4755-f8f2-4290-a40f-ed247803a1a0"
                }
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(schema, jsonSchema)
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({ name: "a1", categories: [] }))
      assertTrue(validate({ name: "a1", categories: [{ name: "a2", categories: [] }] }))
      assertTrue(validate({ name: "a1", categories: [{ name: "a2", categories: [] }, { name: "a3", categories: [] }] }))

      assertTrue(
        validate({
          name: "a1",
          categories: [{ name: "a2", categories: [] }, { name: "a3", categories: [{ name: "a4", categories: [] }] }]
        })
      )
      assertFalse(
        validate({
          name: "a1",
          categories: [{ name: "a2", categories: [] }, { name: "a3", categories: [{ name: "a4", categories: [1] }] }]
        })
      )
    })

    it("should support mutually suspended schemas", () => {
      interface Expression {
        readonly type: "expression"
        readonly value: number | Operation
      }

      interface Operation {
        readonly type: "operation"
        readonly operator: "+" | "-"
        readonly left: Expression
        readonly right: Expression
      }

      // intended outer suspend
      const Expression: Schema.Schema<Expression> = Schema.suspend(() =>
        Schema.Struct({
          type: Schema.Literal("expression"),
          value: Schema.Union(JsonNumber, Operation)
        })
      ).annotations({ identifier: "2ad5683a-878f-4e4d-909c-496e59ce62e0" })

      // intended outer suspend
      const Operation: Schema.Schema<Operation> = Schema.suspend(() =>
        Schema.Struct({
          type: Schema.Literal("operation"),
          operator: Schema.Union(Schema.Literal("+"), Schema.Literal("-")),
          left: Expression,
          right: Expression
        })
      ).annotations({ identifier: "e0f2ce47-eac7-4991-8730-90ebe4e0ffda" })

      const jsonSchema: Root = {
        "$ref": "#/$defs/e0f2ce47-eac7-4991-8730-90ebe4e0ffda",
        "$defs": {
          "e0f2ce47-eac7-4991-8730-90ebe4e0ffda": {
            "type": "object",
            "required": [
              "type",
              "operator",
              "left",
              "right"
            ],
            "properties": {
              "type": {
                "type": "string",
                "enum": ["operation"]
              },
              "operator": {
                "type": "string",
                "enum": ["+", "-"]
              },
              "left": {
                "$ref": "#/$defs/2ad5683a-878f-4e4d-909c-496e59ce62e0"
              },
              "right": {
                "$ref": "#/$defs/2ad5683a-878f-4e4d-909c-496e59ce62e0"
              }
            },
            "additionalProperties": false
          },
          "2ad5683a-878f-4e4d-909c-496e59ce62e0": {
            "type": "object",
            "required": [
              "type",
              "value"
            ],
            "properties": {
              "type": {
                "type": "string",
                "enum": ["expression"]
              },
              "value": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "$ref": "#/$defs/e0f2ce47-eac7-4991-8730-90ebe4e0ffda"
                  }
                ]
              }
            },
            "additionalProperties": false
          }
        }
      }
      expectJSONSchemaProperty(Operation, jsonSchema, { numRuns: 5 })
      const validate = getAjvValidate(jsonSchema)
      assertTrue(validate({
        type: "operation",
        operator: "+",
        left: {
          type: "expression",
          value: 1
        },
        right: {
          type: "expression",
          value: {
            type: "operation",
            operator: "-",
            left: {
              type: "expression",
              value: 3
            },
            right: {
              type: "expression",
              value: 2
            }
          }
        }
      }))
    })
  })

  it("examples JSON Schema annotation support", () => {
    expectJSONSchemaAnnotations(Schema.String.annotations({ examples: ["a", "b"] }), {
      "type": "string",
      "examples": ["a", "b"]
    })
    expectJSONSchemaProperty(Schema.BigInt.annotations({ examples: [1n, 2n] }), {
      "description": "a string to be decoded into a bigint",
      "examples": [
        "1",
        "2"
      ],
      "type": "string"
    })
    expectJSONSchemaProperty(
      Schema.Struct({
        a: Schema.propertySignature(Schema.BigInt).annotations({ examples: [1n, 2n] })
      }),
      {
        "$defs": {
          "BigInt": {
            "type": "string",
            "description": "a string to be decoded into a bigint"
          }
        },
        "type": "object",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "allOf": [
              { "$ref": "#/$defs/BigInt" }
            ],
            "examples": ["1", "2"]
          }
        },
        "additionalProperties": false
      }
    )
  })

  it("default JSON Schema annotation support", () => {
    expectJSONSchemaAnnotations(Schema.String.annotations({ default: "" }), {
      "type": "string",
      "default": ""
    })
  })

  describe("Class", () => {
    it("should use the identifier as JSON Schema identifier", () => {
      const input = Schema.Struct({ a: Schema.String })
      class A extends Schema.Class<A>("7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95")(input) {}
      expectJSONSchemaProperty(A, {
        "$defs": {
          "7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95": {
            "type": "object",
            "required": [
              "a"
            ],
            "properties": {
              "a": {
                "type": "string"
              }
            },
            "additionalProperties": false
          }
        },
        "$ref": "#/$defs/7a8b06e3-ebc1-4bdd-ab0d-3ec493d96d95"
      })
    })

    it("should escape special characters in the $ref", () => {
      const input = Schema.Struct({ a: Schema.String })
      class A extends Schema.Class<A>("~package/name")(input) {}
      expectJSONSchemaProperty(A, {
        "$defs": {
          "~package/name": {
            "type": "object",
            "required": [
              "a"
            ],
            "properties": {
              "a": {
                "type": "string"
              }
            },
            "additionalProperties": false
          }
        },
        "$ref": "#/$defs/~0package~1name"
      })
    })
  })

  it("compose", () => {
    expectJSONSchemaAnnotations(
      Schema.Struct({
        a: Schema.NonEmptyString.pipe(Schema.compose(Schema.NumberFromString))
      }),
      {
        "$defs": {
          "NonEmptyString": {
            "type": "string",
            "title": "nonEmptyString",
            "description": "a non empty string",
            "minLength": 1
          }
        },
        "type": "object",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "$ref": "#/$defs/NonEmptyString"
          }
        },
        "additionalProperties": false
      }
    )
  })

  describe("extend", () => {
    it("should correctly generate JSON Schemas for a schema created by extending two refinements", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.String
        }).pipe(
          Schema.filter(() => true, {
            jsonSchema: { "examples": ["c5052c04-d6c9-44f3-9c8f-ede707d6ce38"] }
          })
        ).pipe(Schema.extend(
          Schema.Struct({
            b: JsonNumber
          }).pipe(
            Schema.filter(() => true, {
              jsonSchema: { "$comment": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15" }
            })
          )
        )),
        {
          "type": "object",
          "required": ["a", "b"],
          "properties": {
            "a": { "type": "string" },
            "b": { "type": "number" }
          },
          "examples": ["c5052c04-d6c9-44f3-9c8f-ede707d6ce38"],
          "$comment": "940b4ea4-6313-4b59-9e64-ff7a41b8eb15",
          "additionalProperties": false
        }
      )
    })
  })

  describe("identifier annotation support", () => {
    it("String", () => {
      expectJSONSchemaProperty(Schema.String.annotations({ identifier: "6f274f5e-be19-48e6-8f33-16e9789b2731" }), {
        "$defs": {
          "6f274f5e-be19-48e6-8f33-16e9789b2731": {
            "type": "string"
          }
        },
        "$ref": "#/$defs/6f274f5e-be19-48e6-8f33-16e9789b2731"
      })
    })

    it("Refinement", () => {
      expectJSONSchemaProperty(
        Schema.String.pipe(Schema.minLength(2)).annotations({ identifier: "cd6647a4-dc64-40a7-a031-61d35ed904ca" }),
        {
          "$defs": {
            "cd6647a4-dc64-40a7-a031-61d35ed904ca": {
              "type": "string",
              "title": "minLength(2)",
              "description": "a string at least 2 character(s) long",
              "minLength": 2
            }
          },
          "$ref": "#/$defs/cd6647a4-dc64-40a7-a031-61d35ed904ca"
        }
      )
    })

    describe("Struct", () => {
      it("self annotation", () => {
        expectJSONSchemaProperty(
          Schema.Struct({
            a: Schema.String
          }).annotations({ identifier: "0df962f3-f649-4ffc-a3ec-a8b5344dd7de" }),
          {
            "$defs": {
              "0df962f3-f649-4ffc-a3ec-a8b5344dd7de": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "$ref": "#/$defs/0df962f3-f649-4ffc-a3ec-a8b5344dd7de"
          }
        )
      })

      it("field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "44873d66-d138-4e2a-9782-5982a29f6ea8",
          description: "e5d30f53-b2df-4fa3-b151-9fc3a47d258e",
          title: "0115ccbf-5d27-41ed-a658-83c5f4a8805f"
        })
        const schema = Schema.Struct({
          a: Name
        })
        expectJSONSchemaProperty(schema, {
          "$defs": {
            "44873d66-d138-4e2a-9782-5982a29f6ea8": {
              "type": "string",
              "description": "e5d30f53-b2df-4fa3-b151-9fc3a47d258e",
              "title": "0115ccbf-5d27-41ed-a658-83c5f4a8805f"
            }
          },
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": {
              "$ref": "#/$defs/44873d66-d138-4e2a-9782-5982a29f6ea8"
            }
          },
          "additionalProperties": false
        })
      })

      it("self annotation + field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "b49f125d-1646-4eb5-8120-9524ab6039de",
          description: "703b7ff0-cb8d-49de-aeeb-05d92faa4599",
          title: "4b6d9ea6-7c4d-4073-a427-8d1b82fd1677"
        })
        expectJSONSchemaProperty(
          Schema.Struct({
            a: Name
          }).annotations({ identifier: "7e559891-9143-4138-ae3e-81a5f0907380" }),
          {
            "$defs": {
              "7e559891-9143-4138-ae3e-81a5f0907380": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "$ref": "#/$defs/b49f125d-1646-4eb5-8120-9524ab6039de" }
                },
                "additionalProperties": false
              },
              "b49f125d-1646-4eb5-8120-9524ab6039de": {
                "type": "string",
                "description": "703b7ff0-cb8d-49de-aeeb-05d92faa4599",
                "title": "4b6d9ea6-7c4d-4073-a427-8d1b82fd1677"
              }
            },
            "$ref": "#/$defs/7e559891-9143-4138-ae3e-81a5f0907380"
          }
        )
      })

      it("deeply nested field annotations", () => {
        const Name = Schema.String.annotations({
          identifier: "434a08dd-3f8f-4de4-b91d-8846aab1fb05",
          description: "eb183f5c-404c-4686-b78b-1bd00d18f8fd",
          title: "c0cbd438-1fb5-47fe-bf81-1ff5527e779a"
        })
        const schema = Schema.Struct({ a: Name, b: Schema.Struct({ c: Name }) })
        expectJSONSchemaProperty(schema, {
          "$defs": {
            "434a08dd-3f8f-4de4-b91d-8846aab1fb05": {
              "type": "string",
              "description": "eb183f5c-404c-4686-b78b-1bd00d18f8fd",
              "title": "c0cbd438-1fb5-47fe-bf81-1ff5527e779a"
            }
          },
          "type": "object",
          "required": ["a", "b"],
          "properties": {
            "a": {
              "$ref": "#/$defs/434a08dd-3f8f-4de4-b91d-8846aab1fb05"
            },
            "b": {
              "type": "object",
              "required": ["c"],
              "properties": {
                "c": { "$ref": "#/$defs/434a08dd-3f8f-4de4-b91d-8846aab1fb05" }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        })
      })
    })

    describe("Union", () => {
      it("Union of literals with identifiers", () => {
        expectJSONSchemaAnnotations(
          Schema.Union(
            Schema.Literal("a").annotations({
              description: "ef296f1c-01fe-4a20-bd35-ed449c964c49",
              identifier: "170d659f-112e-4e3b-85db-464b668f2aed"
            }),
            Schema.Literal("b").annotations({
              description: "effbf54b-a62d-455b-86fa-97a5af46c6f3",
              identifier: "2a4e4f67-3732-4f7b-a505-856e51dd1578"
            })
          ),
          {
            "$defs": {
              "170d659f-112e-4e3b-85db-464b668f2aed": {
                "type": "string",
                "enum": ["a"],
                "description": "ef296f1c-01fe-4a20-bd35-ed449c964c49"
              },
              "2a4e4f67-3732-4f7b-a505-856e51dd1578": {
                "type": "string",
                "enum": ["b"],
                "description": "effbf54b-a62d-455b-86fa-97a5af46c6f3"
              }
            },
            "anyOf": [
              { "$ref": "#/$defs/170d659f-112e-4e3b-85db-464b668f2aed" },
              { "$ref": "#/$defs/2a4e4f67-3732-4f7b-a505-856e51dd1578" }
            ]
          }
        )
      })
    })

    describe("Transformation", () => {
      describe("TypeLiteralTransformation", () => {
        it("an identifier annotation on the transformation should overwrite an annotation set on the from part", () => {
          const schema = Schema.make(
            new AST.Transformation(
              new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
                [AST.IdentifierAnnotationId]: "0f70b90b-b268-46c8-a5a3-035139ad9126"
              }),
              new AST.TypeLiteral([new AST.PropertySignature("a", Schema.String.ast, false, true)], [], {
                [AST.IdentifierAnnotationId]: "77bb2410-9cf3-47cf-af76-fa3be1a3c626"
              }),
              new AST.TypeLiteralTransformation([]),
              { [AST.IdentifierAnnotationId]: "18e1de28-a15e-4373-bd2f-d53903942656" }
            )
          )
          expectJSONSchemaProperty(schema, {
            "$defs": {
              "18e1de28-a15e-4373-bd2f-d53903942656": {
                "type": "object",
                "required": ["a"],
                "properties": {
                  "a": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "$ref": "#/$defs/18e1de28-a15e-4373-bd2f-d53903942656"
          })
        })

        it("with transformation description, title and identifier", () => {
          expectJSONSchemaProperty(
            Schema.Struct({
              a: Schema.optionalWith(
                Schema.NonEmptyString.annotations({
                  description: "inner-description",
                  title: "inner-title"
                }),
                { default: () => "" }
              ).annotations({
                description: "middle-description",
                title: "middle-title"
              })
            }).annotations({
              description: "outer-description",
              title: "outer-title",
              identifier: "75d9b539-eb6b-48d3-81dd-61176a9bce78"
            }),
            {
              "$defs": {
                "75d9b539-eb6b-48d3-81dd-61176a9bce78": {
                  "type": "object",
                  "description": "outer-description",
                  "title": "outer-title",
                  "required": [],
                  "properties": {
                    "a": {
                      "type": "string",
                      "description": "middle-description",
                      "title": "middle-title",
                      "minLength": 1
                    }
                  },
                  "additionalProperties": false
                }
              },
              "$ref": "#/$defs/75d9b539-eb6b-48d3-81dd-61176a9bce78"
            }
          )
        })
      })
    })
  })

  describe("surrogate annotation support", () => {
    describe("Class", () => {
      it("should support typeSchema(Class)", () => {
        class A extends Schema.Class<A>("A")({ a: Schema.String }) {}
        expectJSONSchemaProperty(Schema.typeSchema(A), {
          "$defs": {
            "A": {
              "type": "object",
              "required": ["a"],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          },
          "$ref": "#/$defs/A"
        })
        expectJSONSchemaProperty(
          Schema.typeSchema(A).annotations({
            description: "description",
            title: "title"
          }),
          {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string"
              }
            },
            "additionalProperties": false,
            "description": "description",
            "title": "title"
          }
        )
      })

      it("with identifier annotation", () => {
        class A extends Schema.Class<A>("A")({ a: Schema.String }, {
          identifier: "ID",
          description: "description",
          title: "title"
        }) {}
        expectJSONSchemaProperty(Schema.typeSchema(A), {
          "$defs": {
            "ID": {
              "type": "object",
              "required": ["a"],
              "properties": {
                "a": {
                  "type": "string"
                }
              },
              "additionalProperties": false,
              "description": "description",
              "title": "title"
            }
          },
          "$ref": "#/$defs/ID"
        })
        expectJSONSchemaProperty(
          Schema.typeSchema(A).annotations({
            description: "description",
            title: "title"
          }),
          {
            "type": "object",
            "required": ["a"],
            "properties": {
              "a": {
                "type": "string"
              }
            },
            "additionalProperties": false,
            "description": "description",
            "title": "title"
          }
        )
      })
    })
  })

  describe("jsonSchema annotation support", () => {
    it("refinements without a jsonSchema annotation should be ignored rather than raising an error", () => {
      const schema = Schema.String.pipe(Schema.filter(() => true))
      expectJSONSchema(schema, {
        "type": "string"
      })
    })

    it("should have higher priority than surrogate annotation", () => {
      expectJSONSchema(
        Schema.String.annotations({
          [AST.SurrogateAnnotationId]: Schema.Number.ast,
          jsonSchema: { "type": "custom" }
        }),
        {
          "type": "custom"
        }
      )
    })

    describe("Class", () => {
      it("should support typeSchema(Class) with custom annotation", () => {
        class A extends Schema.Class<A>("3c9977ee-0e9b-4471-99af-c6c73340f9ed")({ a: Schema.String }, {
          jsonSchema: { "type": "custom" }
        }) {}
        expectJSONSchema(Schema.typeSchema(A), {
          "$defs": {
            "3c9977ee-0e9b-4471-99af-c6c73340f9ed": {
              "type": "custom"
            }
          },
          "$ref": "#/$defs/3c9977ee-0e9b-4471-99af-c6c73340f9ed"
        })
      })
    })

    it("Declaration", () => {
      class MyType {}
      const schema = Schema.declare<MyType>((x) => x instanceof MyType, {
        jsonSchema: {
          type: "my-type",
          title: "default-title",
          description: "default-description"
        }
      }).annotations({
        title: "My Title",
        description: "My Description"
      })
      expectJSONSchema(schema, {
        "type": "my-type",
        "title": "My Title",
        "description": "My Description"
      })
    })

    it("Void", () => {
      expectJSONSchema(Schema.Void.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Never", () => {
      expectJSONSchema(Schema.Never.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Literal", () => {
      expectJSONSchema(Schema.Literal("a").annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("SymbolFromSelf", () => {
      expectJSONSchema(Schema.SymbolFromSelf.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("UniqueSymbolFromSelf", () => {
      expectJSONSchema(
        Schema.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")).annotations({
          jsonSchema: { "type": "custom" }
        }),
        { "type": "custom" }
      )
    })

    it("TemplateLiteral", () => {
      expectJSONSchema(
        Schema.TemplateLiteral(Schema.Literal("a"), Schema.String, Schema.Literal("b")).annotations({
          jsonSchema: { "type": "custom" }
        }),
        { "type": "custom" }
      )
    })

    it("Undefined", () => {
      expectJSONSchema(Schema.Undefined.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Unknown", () => {
      expectJSONSchema(Schema.Unknown.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Any", () => {
      expectJSONSchema(Schema.Any.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Object", () => {
      expectJSONSchema(Schema.Object.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("String", () => {
      expectJSONSchema(
        Schema.String.annotations({
          jsonSchema: {
            "type": "custom",
            "description": "description",
            "format": "uuid"
          }
        }),
        {
          "type": "custom",
          "description": "description",
          "format": "uuid"
        }
      )
      expectJSONSchema(
        Schema.String.annotations({
          identifier: "630d10c4-7030-45e7-894d-2c0bf5acadcf",
          jsonSchema: { "type": "custom", "description": "description" }
        }),
        {
          "$defs": {
            "630d10c4-7030-45e7-894d-2c0bf5acadcf": {
              "type": "custom",
              "description": "description"
            }
          },
          "$ref": "#/$defs/630d10c4-7030-45e7-894d-2c0bf5acadcf"
        }
      )
    })

    it("Number", () => {
      expectJSONSchema(Schema.Number.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("BigintFromSelf", () => {
      expectJSONSchema(Schema.BigIntFromSelf.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Boolean", () => {
      expectJSONSchema(Schema.Boolean.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectJSONSchema(Schema.Enums(Fruits).annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("Tuple", () => {
      expectJSONSchema(
        Schema.Tuple(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom" } }),
        { "type": "custom" }
      )
    })

    it("Struct", () => {
      expectJSONSchema(
        Schema.Struct({ a: Schema.String, b: JsonNumber }).annotations({
          jsonSchema: { "type": "custom" }
        }),
        { "type": "custom" }
      )
    })

    it("Union", () => {
      expectJSONSchema(
        Schema.Union(Schema.String, JsonNumber).annotations({ jsonSchema: { "type": "custom" } }),
        { "type": "custom" }
      )
    })

    it("UUID", () => {
      expectJSONSchema(
        Schema.UUID,
        {
          "$defs": {
            "UUID": {
              "description": "a Universally Unique Identifier",
              "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
              "type": "string",
              "format": "uuid"
            }
          },
          "$ref": "#/$defs/UUID"
        }
      )
    })

    it("Suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(
          Schema.suspend((): Schema.Schema<A> => schema).annotations({ jsonSchema: { "type": "custom" } })
        )
      })

      expectJSONSchema(schema, {
        "type": "object",
        "required": [
          "a",
          "as"
        ],
        "properties": {
          "a": {
            "type": "string"
          },
          "as": {
            "type": "array",
            "items": {
              "type": "custom"
            }
          }
        },
        "additionalProperties": false
      })
    })

    describe("Refinement", () => {
      it("Int", () => {
        expectJSONSchema(Schema.Int.annotations({ jsonSchema: { "type": "custom" } }), {
          "type": "custom"
        })
      })

      it("custom", () => {
        expectJSONSchemaProperty(
          Schema.String.pipe(Schema.filter(() => true, { jsonSchema: {} })).annotations({
            identifier: "230acf3d-b3b0-4c3e-8ccc-5ca089c80014"
          }),
          {
            "$ref": "#/$defs/230acf3d-b3b0-4c3e-8ccc-5ca089c80014",
            "$defs": {
              "230acf3d-b3b0-4c3e-8ccc-5ca089c80014": {
                "type": "string"
              }
            }
          }
        )
      })
    })

    it("Transformation", () => {
      expectJSONSchema(Schema.NumberFromString.annotations({ jsonSchema: { "type": "custom" } }), {
        "type": "custom"
      })
    })

    it("refinement of a transformation with an override annotation", () => {
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { type: "string", format: "date-time" } }), {
        "format": "date-time",
        "type": "string"
      })
      expectJSONSchema(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        {
          "anyOf": [{ "type": "object" }, { "type": "array" }]
        }
      )
      expectJSONSchema(
        Schema.Date.annotations({
          jsonSchema: { anyOf: [{ type: "object" }, { type: "array" }] }
        }),
        {
          "anyOf": [{ "type": "object" }, { "type": "array" }]
        }
      )
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { "$ref": "x" } }), {
        "$ref": "x"
      })
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { "type": "number", "const": 1 } }), {
        "type": "number",
        "const": 1
      })
      expectJSONSchema(Schema.Date.annotations({ jsonSchema: { "type": "number", "enum": [1] } }), {
        "type": "number",
        "enum": [1]
      })
    })

    it("refinement of a transformation without an override annotation", () => {
      expectJSONSchema(Schema.Trim.pipe(Schema.nonEmptyString()), {
        "type": "string",
        "description": "a string that will be trimmed"
      })
      expectJSONSchema(
        Schema.Trim.pipe(Schema.nonEmptyString({ jsonSchema: { title: "a0ba6c10-091e-4ceb-9773-25fb1466fb1b" } })),
        {
          "type": "string",
          "description": "a string that will be trimmed"
        }
      )
      expectJSONSchema(
        Schema.Trim.pipe(Schema.nonEmptyString()).annotations({
          jsonSchema: { title: "75f7eb4f-626d-4dc6-af48-c17094418d85" }
        }),
        {
          "type": "string",
          "description": "a string that will be trimmed"
        }
      )
    })
  })

  describe("Pruning `undefined` and make the property optional by default", () => {
    it("Undefined", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.Undefined
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "$id": "/schemas/never",
              "not": {},
              "title": "never"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr(Undefined)", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.Undefined)
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "$id": "/schemas/never",
              "not": {},
              "title": "never"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("Nested `Undefined`s", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.UndefinedOr(Schema.Undefined))
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "$id": "/schemas/never",
              "not": {},
              "title": "never"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("Schema.optional", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.optional(Schema.String)
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false
        }
      )
    })

    it("Schema.optional + inner annotation", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.optional(Schema.String.annotations({ description: "inner" }))
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("Schema.optional + outer annotation should override inner annotation", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.optional(Schema.String.annotations({ description: "inner" })).annotations({
            description: "outer"
          })
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String)
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + inner annotation", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String.annotations({ description: "inner" }))
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + annotation should not override inner annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String.annotations({ description: "inner" })).annotations({
            description: "middle"
          })
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "inner"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + propertySignature annotation should override inner and middle annotations", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.propertySignature(
            Schema.UndefinedOr(Schema.String.annotations({ description: "inner" })).annotations({
              description: "middle"
            })
          ).annotations({ description: "outer" })
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string",
              "description": "outer"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("UndefinedOr + jsonSchema annotation should keep the property required", () => {
      expectJSONSchema(
        Schema.Struct({
          a: Schema.UndefinedOr(Schema.String).annotations({ jsonSchema: { "type": "string" } })
        }),
        {
          "type": "object",
          "required": ["a"],
          "properties": {
            "a": { "type": "string" }
          },
          "additionalProperties": false
        }
      )
    })

    it("Transformation: OptionFromUndefinedOr", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.OptionFromUndefinedOr(Schema.String)
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      )
    })

    it("Suspend", () => {
      expectJSONSchemaAnnotations(
        Schema.Struct({
          a: Schema.suspend(() => Schema.UndefinedOr(Schema.String))
        }),
        {
          "type": "object",
          "required": [],
          "properties": {
            "a": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      )
    })
  })

  describe("Schema.encodedBoundSchema / Schema.encodedSchema", () => {
    describe("borrowing the identifier", () => {
      describe("Declaration", () => {
        it("without inner transformation", () => {
          const schema = Schema.Chunk(Schema.String).annotations({ identifier: "ID" })
          const expected = {
            "items": {
              "type": "string"
            },
            "type": "array"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformation", () => {
          const schema = Schema.Chunk(Schema.NumberFromString).annotations({
            identifier: "ID"
          })
          const expected = {
            "items": {
              "description": "a string to be decoded into a number",
              "type": "string"
            },
            "type": "array"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Refinement", () => {
        it("without from transformation", () => {
          const schema = Schema.Trimmed
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
            "$defs": {
              "Trimmed": {
                "title": "trimmed",
                "description": "a string with no leading or trailing whitespace",
                "pattern": "^\\S[\\s\\S]*\\S$|^\\S$|^$",
                "type": "string"
              }
            },
            "$ref": "#/$defs/Trimmed"
          })
          expectJSONSchemaProperty(Schema.encodedSchema(schema), {
            "type": "string"
          })
        })

        it("with from transformation", () => {
          const schema = Schema.compose(Schema.String, Schema.Trimmed).annotations({
            identifier: "ID"
          })
          const expected = {
            "type": "string"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("a stable filter without inner transformations", () => {
          const schema = Schema.Array(Schema.NumberFromString).pipe(Schema.minItems(2)).annotations(
            { identifier: "ID" }
          )
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
            "$defs": {
              "ID": {
                "description": "an array of at least 2 item(s)",
                "title": "minItems(2)",
                "items": {
                  "description": "a string to be decoded into a number",
                  "type": "string"
                },
                "minItems": 2,
                "type": "array"
              }
            },
            "$ref": "#/$defs/ID"
          })
          expectJSONSchemaProperty(Schema.encodedSchema(schema), {
            "items": {
              "description": "a string to be decoded into a number",
              "type": "string"
            },
            "type": "array"
          })
        })

        it("a stable filter with inner transformations SHOULD NOT borrow the annotations, identifier included", () => {
          const schema = Schema.compose(Schema.Unknown, Schema.Array(Schema.String)).pipe(Schema.minItems(1))
          const expected = {
            "$id": "/schemas/unknown",
            "title": "unknown"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Tuple", () => {
        it("without inner transformations", () => {
          const schema = Schema.Tuple(Schema.String).annotations({
            identifier: "4d8bbca3-9462-4679-8ee6-e4e718711552"
          })
          const expected = {
            "$defs": {
              "4d8bbca3-9462-4679-8ee6-e4e718711552": {
                "additionalItems": false,
                "items": [{ "type": "string" }],
                "minItems": 1,
                "type": "array"
              }
            },
            "$ref": "#/$defs/4d8bbca3-9462-4679-8ee6-e4e718711552"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformations", () => {
          const schema = Schema.Tuple(Schema.NumberFromString).annotations({
            identifier: "ID"
          })
          const expected = {
            "additionalItems": false,
            "items": [{
              "description": "a string to be decoded into a number",
              "type": "string"
            }],
            "minItems": 1,
            "type": "array"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Struct", () => {
        it("without inner transformations", () => {
          const schema = Schema.Struct({ a: Schema.String }).annotations({
            identifier: "c8d0663b-c41b-4b6f-8b6e-bff59afc87c3"
          })
          const expected = {
            "$defs": {
              "c8d0663b-c41b-4b6f-8b6e-bff59afc87c3": {
                "additionalProperties": false,
                "properties": {
                  "a": { "type": "string" }
                },
                "required": ["a"],
                "type": "object"
              }
            },
            "$ref": "#/$defs/c8d0663b-c41b-4b6f-8b6e-bff59afc87c3"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })

        it("with inner transformations", () => {
          const schema = Schema.Struct({ a: Schema.NumberFromString }).annotations({
            identifier: "ID"
          })
          const expected = {
            "additionalProperties": false,
            "properties": {
              "a": {
                "description": "a string to be decoded into a number",
                "type": "string"
              }
            },
            "required": ["a"],
            "type": "object"
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Union", () => {
        it("without inner transformations", () => {
          const schema = Schema.Union(Schema.String, Schema.JsonNumber).annotations({
            identifier: "ID"
          })
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
            "$defs": {
              "JsonNumber": {
                "description": "a finite number",
                "title": "finite",
                "type": "number"
              },
              "ID": {
                "anyOf": [
                  { "type": "string" },
                  { "$ref": "#/$defs/JsonNumber" }
                ]
              }
            },
            "$ref": "#/$defs/ID"
          })
          expectJSONSchema(Schema.encodedSchema(schema), {
            "anyOf": [
              { "type": "string" },
              { "type": "number" }
            ]
          })
        })

        it("with inner transformations", () => {
          const schema = Schema.Union(Schema.String, Schema.NumberFromString).annotations({
            identifier: "ID"
          })
          const expected = {
            "anyOf": [
              { "type": "string" },
              { "description": "a string to be decoded into a number", "type": "string" }
            ]
          }
          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), expected)
          expectJSONSchemaProperty(Schema.encodedSchema(schema), expected)
        })
      })

      describe("Suspend", () => {
        it("without inner transformations", () => {
          interface Category {
            readonly name: string
            readonly categories: ReadonlyArray<Category>
          }

          const schema: Schema.Schema<Category> = Schema.Struct({
            name: Schema.String,
            categories: Schema.Array(
              Schema.suspend(() => schema).annotations({ identifier: "ID" })
            )
          })

          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/IDEncodedBound"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncodedBound": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/IDEncodedBound"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
          expectJSONSchemaProperty(Schema.encodedSchema(schema), {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "type": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/IDEncoded"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncoded": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/IDEncoded"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
        })

        it("with inner transformations", () => {
          interface Category {
            readonly name: number
            readonly categories: ReadonlyArray<Category>
          }
          interface CategoryEncoded {
            readonly name: string
            readonly categories: ReadonlyArray<CategoryEncoded>
          }

          const schema: Schema.Schema<Category, CategoryEncoded> = Schema.Struct({
            name: Schema.NumberFromString,
            categories: Schema.Array(
              Schema.suspend(() => schema).annotations({ identifier: "ID" })
            )
          })

          expectJSONSchemaProperty(Schema.encodedBoundSchema(schema), {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "description": "a string to be decoded into a number",
                "type": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/IDEncodedBound"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncodedBound": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "description": "a string to be decoded into a number",
                    "type": "string"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/IDEncodedBound"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
          expectJSONSchemaProperty(Schema.encodedSchema(schema), {
            "type": "object",
            "required": [
              "name",
              "categories"
            ],
            "properties": {
              "name": {
                "description": "a string to be decoded into a number",
                "type": "string"
              },
              "categories": {
                "type": "array",
                "items": {
                  "$ref": "#/$defs/IDEncoded"
                }
              }
            },
            "additionalProperties": false,
            "$defs": {
              "IDEncoded": {
                "type": "object",
                "required": [
                  "name",
                  "categories"
                ],
                "properties": {
                  "name": {
                    "description": "a string to be decoded into a number",
                    "type": "string"
                  },
                  "categories": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/IDEncoded"
                    }
                  }
                },
                "additionalProperties": false
              }
            }
          })
        })
      })

      it("Transformation", () => {
        const expected = {
          "type": "string",
          "description": "a string to be decoded into a number"
        }
        expectJSONSchemaProperty(Schema.encodedBoundSchema(Schema.NumberFromString), expected)
        expectJSONSchemaProperty(Schema.encodedSchema(Schema.NumberFromString), expected)
      })
    })
  })

  it("Exit", () => {
    const schema = Schema.Exit({
      failure: Schema.String,
      success: Schema.Number,
      defect: Schema.Defect
    })
    expectJSONSchemaProperty(schema, {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "$defs": {
        "CauseEncoded0": {
          "anyOf": [
            {
              "type": "object",
              "required": [
                "_tag"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Empty"
                  ]
                }
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": [
                "_tag",
                "error"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Fail"
                  ]
                },
                "error": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": [
                "_tag",
                "defect"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Die"
                  ]
                },
                "defect": {
                  "$ref": "#/$defs/Defect"
                }
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": [
                "_tag",
                "fiberId"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Interrupt"
                  ]
                },
                "fiberId": {
                  "$ref": "#/$defs/FiberIdEncoded"
                }
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": [
                "_tag",
                "left",
                "right"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Sequential"
                  ]
                },
                "left": {
                  "$ref": "#/$defs/CauseEncoded0"
                },
                "right": {
                  "$ref": "#/$defs/CauseEncoded0"
                }
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": [
                "_tag",
                "left",
                "right"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Parallel"
                  ]
                },
                "left": {
                  "$ref": "#/$defs/CauseEncoded0"
                },
                "right": {
                  "$ref": "#/$defs/CauseEncoded0"
                }
              },
              "additionalProperties": false
            }
          ],
          "title": "CauseEncoded<string>"
        },
        "Defect": {
          "$id": "/schemas/unknown",
          "title": "unknown"
        },
        "FiberIdEncoded": {
          "anyOf": [
            {
              "$ref": "#/$defs/FiberIdNoneEncoded"
            },
            {
              "$ref": "#/$defs/FiberIdRuntimeEncoded"
            },
            {
              "$ref": "#/$defs/FiberIdCompositeEncoded"
            }
          ]
        },
        "FiberIdNoneEncoded": {
          "type": "object",
          "required": [
            "_tag"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "None"
              ]
            }
          },
          "additionalProperties": false
        },
        "FiberIdRuntimeEncoded": {
          "type": "object",
          "required": [
            "_tag",
            "id",
            "startTimeMillis"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Runtime"
              ]
            },
            "id": {
              "$ref": "#/$defs/Int"
            },
            "startTimeMillis": {
              "$ref": "#/$defs/Int"
            }
          },
          "additionalProperties": false
        },
        "Int": {
          "type": "integer",
          "description": "an integer",
          "title": "int"
        },
        "FiberIdCompositeEncoded": {
          "type": "object",
          "required": [
            "_tag",
            "left",
            "right"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Composite"
              ]
            },
            "left": {
              "$ref": "#/$defs/FiberIdEncoded"
            },
            "right": {
              "$ref": "#/$defs/FiberIdEncoded"
            }
          },
          "additionalProperties": false
        }
      },
      "anyOf": [
        {
          "type": "object",
          "required": [
            "_tag",
            "cause"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Failure"
              ]
            },
            "cause": {
              "$ref": "#/$defs/CauseEncoded0"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "_tag",
            "value"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Success"
              ]
            },
            "value": {
              "type": "number"
            }
          },
          "additionalProperties": false
        }
      ],
      "title": "ExitEncoded<number, string, Defect>"
    })
  })
})
