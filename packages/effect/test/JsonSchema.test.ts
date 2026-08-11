import { assert, describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as JsonSchema from "effect/JsonSchema"
import * as Schema from "effect/Schema"

// oxlint-disable-next-line @typescript-eslint/no-require-imports
const AjvDraft07 = require("ajv")
// oxlint-disable-next-line @typescript-eslint/no-require-imports
const AjvDraft04 = require("ajv-draft-04")

const ajvDraft07 = new AjvDraft07.default({ allErrors: true, strict: false })
const ajvDraft04 = new AjvDraft04.default({ allErrors: true, strict: false })

function makeSchema(document: JsonSchema.Document<"draft-04" | "draft-07">): JsonSchema.JsonSchema {
  return {
    $schema: document.dialect === "draft-04"
      ? JsonSchema.META_SCHEMA_URI_DRAFT_04
      : JsonSchema.META_SCHEMA_URI_DRAFT_07,
    ...document.schema,
    ...(Object.keys(document.definitions).length > 0 ? { definitions: document.definitions } : {})
  }
}

function assertDoesNotMutate<A>(input: A, f: (input: A) => unknown): void {
  const before = structuredClone(input)
  f(input)
  deepStrictEqual(input, before)
}

describe("JsonSchema", () => {
  describe("meta-schema URIs", () => {
    it("exports the URI for every supported dialect", () => {
      deepStrictEqual(JsonSchema.META_SCHEMA_URI_DRAFT_04, "http://json-schema.org/draft-04/schema#")
      deepStrictEqual(JsonSchema.META_SCHEMA_URI_DRAFT_07, "http://json-schema.org/draft-07/schema#")
      deepStrictEqual(JsonSchema.META_SCHEMA_URI_DRAFT_2020_12, "https://json-schema.org/draft/2020-12/schema")
    })
  })

  describe("resolve$ref", () => {
    it("resolves a definition", () => {
      const definition: JsonSchema.JsonSchema = { type: "string" }
      deepStrictEqual(JsonSchema.resolve$ref("#/$defs/A", { A: definition }), definition)
    })

    it("unescapes the referenced JSON Pointer token", () => {
      const definition: JsonSchema.JsonSchema = { type: "string" }
      deepStrictEqual(JsonSchema.resolve$ref("#/$defs/A~1B~0C", { "A/B~C": definition }), definition)
    })

    it("returns undefined for a missing definition", () => {
      deepStrictEqual(JsonSchema.resolve$ref("#/$defs/Missing", {}), undefined)
    })

    it("ignores inherited definitions", () => {
      deepStrictEqual(JsonSchema.resolve$ref("#/$defs/constructor", {}), undefined)
    })

    it("resolves __proto__ when it is an own definition", () => {
      const definition: JsonSchema.JsonSchema = { type: "string" }
      deepStrictEqual(
        JsonSchema.resolve$ref("#/$defs/__proto__", { ["__proto__"]: definition }),
        definition
      )
    })
  })

  describe("resolveTopLevel$ref", () => {
    it("resolves a top-level ref without mutating the document definitions", () => {
      const definition: JsonSchema.JsonSchema = { type: "string" }
      const document: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: { $ref: "#/$defs/A" },
        definitions: { A: definition }
      }
      const result = JsonSchema.resolveTopLevel$ref(document)

      assert.notStrictEqual(result, document)
      assert.strictEqual(result.definitions, document.definitions)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: definition,
        definitions: document.definitions
      })
    })

    it("returns the same document when the top-level ref cannot be resolved", () => {
      const document: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: { $ref: "#/$defs/Missing" },
        definitions: {}
      }

      assert.strictEqual(JsonSchema.resolveTopLevel$ref(document), document)
    })

    it("returns the same document when there is no string top-level ref", () => {
      const withoutRef: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: { type: "string" },
        definitions: {}
      }
      const withNonStringRef: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: { $ref: 1 },
        definitions: {}
      }

      assert.strictEqual(JsonSchema.resolveTopLevel$ref(withoutRef), withoutRef)
      assert.strictEqual(JsonSchema.resolveTopLevel$ref(withNonStringRef), withNonStringRef)
    })
  })

  describe("sanitizeOpenApiComponentsSchemasKey", () => {
    const sanitizeOpenApiComponentsKey = JsonSchema.sanitizeOpenApiComponentsSchemasKey

    it("returns '_' for empty input", () => {
      deepStrictEqual(sanitizeOpenApiComponentsKey(""), "_")
    })

    it("returns input when already valid", () => {
      deepStrictEqual(sanitizeOpenApiComponentsKey("Simple"), "Simple")
      deepStrictEqual(sanitizeOpenApiComponentsKey("with-dash"), "with-dash")
      deepStrictEqual(sanitizeOpenApiComponentsKey("with_underscore"), "with_underscore")
      deepStrictEqual(sanitizeOpenApiComponentsKey("with.dot"), "with.dot")
      deepStrictEqual(sanitizeOpenApiComponentsKey("A1.B2-_"), "A1.B2-_")
    })

    it("replaces invalid characters with '_'", () => {
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["a b", "a_b"],
        ["a/b", "a_b"],
        ["a:b", "a_b"],
        ["a@b", "a_b"],
        ["a#b", "a_b"],
        ["a?b", "a_b"],
        ["a+b", "a_b"],
        ["a*b", "a_b"],
        ["a,b", "a_b"],
        ["a;b", "a_b"],
        ["a|b", "a_b"],
        ["a=b", "a_b"]
      ]
      for (const [input, expected] of cases) {
        deepStrictEqual(sanitizeOpenApiComponentsKey(input), expected)
      }
    })

    it("preserves length when only replacements are needed", () => {
      deepStrictEqual(sanitizeOpenApiComponentsKey("a b").length, "a b".length)
      deepStrictEqual(sanitizeOpenApiComponentsKey("..").length, "..".length)
      deepStrictEqual(sanitizeOpenApiComponentsKey("a--b").length, "a--b".length)
    })

    it("replaces non-ascii characters with '_'", () => {
      deepStrictEqual(sanitizeOpenApiComponentsKey("café"), "caf_")
      deepStrictEqual(sanitizeOpenApiComponentsKey("你好"), "__")
      deepStrictEqual(sanitizeOpenApiComponentsKey("🤖"), "_")
      deepStrictEqual(sanitizeOpenApiComponentsKey("a🤖b"), "a_b")
    })

    it("is idempotent", () => {
      const inputs = [
        "",
        "Simple",
        "a b",
        "a/b",
        "a..b",
        "café",
        "🤖",
        "A1.B2-_"
      ] as const
      for (const input of inputs) {
        const once = sanitizeOpenApiComponentsKey(input)
        const twice = sanitizeOpenApiComponentsKey(once)
        deepStrictEqual(twice, once)
      }
    })
  })

  describe("fromSchemaDraft07", () => {
    it("preserves not", () => {
      const input: JsonSchema.JsonSchema = { not: { type: "string" } }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: { not: { type: "string" } },
        definitions: {}
      })
    })

    it("normalizes a schema without definitions to the canonical document shape", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string"
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string"
        },
        definitions: {}
      })
    })

    it("extracts root definitions and rewrites Draft-07 refs to $defs refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          a: { $ref: "#/definitions/A" },
          b: { $ref: "#/definitions/B" }
        },
        definitions: {
          A: {
            type: "string",
            $ref: "#/definitions/B"
          },
          B: {
            type: "number"
          }
        }
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: { $ref: "#/$defs/A" },
            b: { $ref: "#/$defs/B" }
          }
        },
        definitions: {
          A: {
            type: "string",
            $ref: "#/$defs/B"
          },
          B: {
            type: "number"
          }
        }
      })
    })

    it("converts Draft-07 tuple items to prefixItems", () => {
      const input: JsonSchema.JsonSchema = {
        type: "array",
        items: [
          { type: "string" },
          { type: "number" }
        ],
        additionalItems: { type: "boolean" }
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "array",
          prefixItems: [
            { type: "string" },
            { type: "number" }
          ],
          items: { type: "boolean" }
        },
        definitions: {}
      })
    })

    it("preserves a single items schema as items", () => {
      const input: JsonSchema.JsonSchema = {
        type: "array",
        items: { type: "string" }
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "array",
          items: { type: "string" }
        },
        definitions: {}
      })
    })

    it("preserves annotations", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string",
        title: "My String",
        description: "A string value",
        default: "default",
        examples: ["example1", "example2"],
        format: "email",
        readOnly: true,
        writeOnly: true
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string",
          title: "My String",
          description: "A string value",
          default: "default",
          examples: ["example1", "example2"],
          format: "email",
          readOnly: true,
          writeOnly: true
        },
        definitions: {}
      })
    })

    it("preserves string constraints", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string",
        pattern: "^[a-z]+$",
        minLength: 1,
        maxLength: 100
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string",
          pattern: "^[a-z]+$",
          minLength: 1,
          maxLength: 100
        },
        definitions: {}
      })
    })

    it("preserves number constraints", () => {
      const input: JsonSchema.JsonSchema = {
        type: "number",
        minimum: 0,
        maximum: 100,
        exclusiveMinimum: 0,
        exclusiveMaximum: 100,
        multipleOf: 2
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "number",
          minimum: 0,
          maximum: 100,
          exclusiveMinimum: 0,
          exclusiveMaximum: 100,
          multipleOf: 2
        },
        definitions: {}
      })
    })

    it("preserves array constraints", () => {
      const input: JsonSchema.JsonSchema = {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 10,
        uniqueItems: true
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 10,
          uniqueItems: true
        },
        definitions: {}
      })
    })

    it("preserves object constraints", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        },
        required: ["name"],
        patternProperties: {
          "^S_": { type: "string" }
        },
        additionalProperties: { type: "boolean" },
        propertyNames: { pattern: "^[A-Z]" },
        minProperties: 1,
        maxProperties: 10
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" }
          },
          required: ["name"],
          patternProperties: {
            "^S_": { type: "string" }
          },
          additionalProperties: { type: "boolean" },
          propertyNames: { pattern: "^[A-Z]" },
          minProperties: 1,
          maxProperties: 10
        },
        definitions: {}
      })
    })

    it("preserves enum, const, allOf, anyOf, and oneOf", () => {
      const input: JsonSchema.JsonSchema = {
        enum: ["a", "b", "c"],
        const: "constant",
        allOf: [
          { type: "array", items: { type: "string" } },
          { minItems: 1 }
        ],
        anyOf: [
          { type: "array", items: [{ type: "string" }] },
          { type: "number" }
        ],
        oneOf: [
          { type: "array", items: [{ type: "string" }], additionalItems: { type: "number" } },
          { type: "boolean" }
        ]
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          enum: ["a", "b", "c"],
          const: "constant",
          allOf: [
            { type: "array", items: { type: "string" } },
            { minItems: 1 }
          ],
          anyOf: [
            { type: "array", prefixItems: [{ type: "string" }] },
            { type: "number" }
          ],
          oneOf: [
            { type: "array", prefixItems: [{ type: "string" }], items: { type: "number" } },
            { type: "boolean" }
          ]
        },
        definitions: {}
      })
    })

    it("preserves nested definitions and local JSON Pointer refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          nested: {
            definitions: {
              NestedType: {
                type: "number"
              }
            },
            $ref: "#/properties/nested/definitions/NestedType"
          }
        }
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            nested: {
              definitions: {
                NestedType: {
                  type: "number"
                }
              },
              $ref: "#/properties/nested/definitions/NestedType"
            }
          }
        },
        definitions: {}
      })
    })

    it("drops non-standard properties in Draft-07 input", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string",
        "x-custom": "value"
      }
      const result = JsonSchema.fromSchemaDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string"
        },
        definitions: {}
      })
    })

    it("preserves malformed values for recognized keywords", () => {
      const input: JsonSchema.JsonSchema = {
        $ref: 1,
        definitions: {
          Invalid: [1, { not: false }] as unknown as JsonSchema.JsonSchema
        },
        properties: {
          nested: {
            definitions: "invalid",
            not: [false, { type: "string" }]
          }
        },
        patternProperties: "invalid",
        allOf: "invalid"
      }

      deepStrictEqual(JsonSchema.fromSchemaDraft07(input), {
        dialect: "draft-2020-12",
        schema: {
          $ref: 1,
          properties: {
            nested: {
              definitions: "invalid",
              not: [false, { type: "string" }]
            }
          },
          patternProperties: "invalid",
          allOf: "invalid"
        },
        definitions: {
          Invalid: [1, { not: false }] as unknown as JsonSchema.JsonSchema
        }
      })
    })

    it("ignores additionalItems when items is not a tuple", () => {
      deepStrictEqual(
        JsonSchema.fromSchemaDraft07({
          type: "array",
          items: { type: "string" },
          additionalItems: false
        }).schema,
        {
          type: "array",
          items: { type: "string" }
        }
      )
    })
  })

  describe("fromSchemaDraft2020_12", () => {
    it("normalizes a schema without $defs to the canonical document shape", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string"
      }
      const result = JsonSchema.fromSchemaDraft2020_12(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string"
        },
        definitions: {}
      })
    })

    it("extracts root $defs without rewriting Draft-2020-12 refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          a: { $ref: "#/$defs/A" },
          b: { $ref: "#/$defs/B" }
        },
        $defs: {
          A: {
            type: "string",
            $ref: "#/$defs/B"
          },
          B: {
            type: "number"
          }
        }
      }
      const result = JsonSchema.fromSchemaDraft2020_12(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: { $ref: "#/$defs/A" },
            b: { $ref: "#/$defs/B" }
          }
        },
        definitions: {
          A: {
            type: "string",
            $ref: "#/$defs/B"
          },
          B: {
            type: "number"
          }
        }
      })
    })

    it("preserves nested definitions and local JSON Pointer refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          nested: {
            definitions: {
              NestedType: {
                type: "number"
              }
            },
            $ref: "#/properties/nested/definitions/NestedType"
          }
        }
      }
      const result = JsonSchema.fromSchemaDraft2020_12(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            nested: {
              definitions: {
                NestedType: {
                  type: "number"
                }
              },
              $ref: "#/properties/nested/definitions/NestedType"
            }
          }
        },
        definitions: {}
      })
    })

    it("keeps non-standard properties for Draft-2020-12 input", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string",
        "x-custom": "value"
      }
      const result = JsonSchema.fromSchemaDraft2020_12(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string",
          "x-custom": "value"
        },
        definitions: {}
      })
    })
  })

  describe("fromSchemaOpenApi3_1", () => {
    it("preserves non-string refs and malformed schema maps", () => {
      const input: JsonSchema.JsonSchema = {
        $ref: null,
        enum: [null],
        properties: [{ $ref: "#/components/schemas/Literal" }]
      }

      deepStrictEqual(JsonSchema.fromSchemaOpenApi3_1(input), {
        dialect: "draft-2020-12",
        schema: input,
        definitions: {}
      })
    })

    it("rewrites OpenAPI component schema refs to $defs refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          a: { $ref: "#/components/schemas/A" },
          b: { $ref: "#/components/schemas/B" }
        }
      }
      const result = JsonSchema.fromSchemaOpenApi3_1(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: { $ref: "#/$defs/A" },
            b: { $ref: "#/$defs/B" }
          }
        },
        definitions: {}
      })
    })

    it("rewrites refs only in schema positions", () => {
      const literal = { $ref: "#/components/schemas/Literal" }
      const input: JsonSchema.JsonSchema = {
        properties: { value: { $ref: "#/components/schemas/Value" } },
        const: literal,
        enum: [literal],
        default: literal,
        examples: [literal]
      }

      deepStrictEqual(JsonSchema.fromSchemaOpenApi3_1(input), {
        dialect: "draft-2020-12",
        schema: {
          properties: { value: { $ref: "#/$defs/Value" } },
          const: literal,
          enum: [literal],
          default: literal,
          examples: [literal]
        },
        definitions: {}
      })
    })

    it("rewrites refs throughout Draft 2020-12 subschemas", () => {
      const input: JsonSchema.JsonSchema = {
        $defs: { Alias: { $ref: "#/components/schemas/Value" } },
        properties: { value: { $ref: "#/components/schemas/Value" } },
        patternProperties: { pattern: { $ref: "#/components/schemas/Value" } },
        dependentSchemas: { dependency: { $ref: "#/components/schemas/Value" } },
        allOf: [{ $ref: "#/components/schemas/Value" }],
        anyOf: [{ $ref: "#/components/schemas/Value" }],
        oneOf: [{ $ref: "#/components/schemas/Value" }],
        prefixItems: [{ $ref: "#/components/schemas/Value" }],
        additionalProperties: { $ref: "#/components/schemas/Value" },
        unevaluatedProperties: { $ref: "#/components/schemas/Value" },
        propertyNames: { $ref: "#/components/schemas/Value" },
        items: { $ref: "#/components/schemas/Value" },
        contains: { $ref: "#/components/schemas/Value" },
        unevaluatedItems: { $ref: "#/components/schemas/Value" },
        not: { $ref: "#/components/schemas/Value" },
        if: { $ref: "#/components/schemas/Value" },
        // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema keyword
        then: { $ref: "#/components/schemas/Value" },
        else: { $ref: "#/components/schemas/Value" },
        contentSchema: { $ref: "#/components/schemas/Value" }
      }

      deepStrictEqual(JsonSchema.fromSchemaOpenApi3_1(input), {
        dialect: "draft-2020-12",
        schema: {
          properties: { value: { $ref: "#/$defs/Value" } },
          patternProperties: { pattern: { $ref: "#/$defs/Value" } },
          dependentSchemas: { dependency: { $ref: "#/$defs/Value" } },
          allOf: [{ $ref: "#/$defs/Value" }],
          anyOf: [{ $ref: "#/$defs/Value" }],
          oneOf: [{ $ref: "#/$defs/Value" }],
          prefixItems: [{ $ref: "#/$defs/Value" }],
          additionalProperties: { $ref: "#/$defs/Value" },
          unevaluatedProperties: { $ref: "#/$defs/Value" },
          propertyNames: { $ref: "#/$defs/Value" },
          items: { $ref: "#/$defs/Value" },
          contains: { $ref: "#/$defs/Value" },
          unevaluatedItems: { $ref: "#/$defs/Value" },
          not: { $ref: "#/$defs/Value" },
          if: { $ref: "#/$defs/Value" },
          // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema keyword
          then: { $ref: "#/$defs/Value" },
          else: { $ref: "#/$defs/Value" },
          contentSchema: { $ref: "#/$defs/Value" }
        },
        definitions: { Alias: { $ref: "#/$defs/Value" } }
      })
    })

    it("extracts root $defs after rewriting OpenAPI component refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          a: {
            $ref: "#/components/schemas/A"
          }
        },
        $defs: {
          MyType: {
            type: "string"
          }
        }
      }
      const result = JsonSchema.fromSchemaOpenApi3_1(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: {
              $ref: "#/$defs/A"
            }
          }
        },
        definitions: {
          MyType: {
            type: "string"
          }
        }
      })
    })

    it("preserves nested definitions and local JSON Pointer refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          nested: {
            definitions: {
              NestedType: {
                type: "number"
              }
            },
            $ref: "#/properties/nested/definitions/NestedType"
          }
        }
      }
      const result = JsonSchema.fromSchemaOpenApi3_1(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            nested: {
              definitions: {
                NestedType: {
                  type: "number"
                }
              },
              $ref: "#/properties/nested/definitions/NestedType"
            }
          }
        },
        definitions: {}
      })
    })

    it("keeps non-standard properties for OpenAPI 3.1 input", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string",
        "x-custom": "value"
      }
      const result = JsonSchema.fromSchemaOpenApi3_1(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string",
          "x-custom": "value"
        },
        definitions: {}
      })
    })
  })

  describe("fromSchemaOpenApi3_0", () => {
    function assertFromSchemaOpenApi3_0(input: JsonSchema.JsonSchema, expected: {
      readonly schema: JsonSchema.JsonSchema
      readonly definitions?: JsonSchema.Definitions
    }) {
      const result = JsonSchema.fromSchemaOpenApi3_0(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: expected.schema,
        definitions: expected.definitions ?? {}
      })
    }

    it("rewrites OpenAPI 3.0 component schema refs to $defs refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          a: { $ref: "#/components/schemas/A" },
          b: { $ref: "#/components/schemas/B" }
        }
      }
      const result = JsonSchema.fromSchemaOpenApi3_0(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: { $ref: "#/$defs/A" },
            b: { $ref: "#/$defs/B" }
          }
        },
        definitions: {}
      })
    })

    it("extracts root definitions after rewriting OpenAPI component refs", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        properties: {
          a: {
            $ref: "#/components/schemas/A"
          }
        },
        definitions: {
          MyType: {
            type: "string"
          }
        }
      }
      const result = JsonSchema.fromSchemaOpenApi3_0(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: {
              $ref: "#/$defs/A"
            }
          }
        },
        definitions: {
          MyType: {
            type: "string"
          }
        }
      })
    })

    it("normalizes singular OpenAPI 3.0 example to a draft examples array", () => {
      const input: JsonSchema.JsonSchema = {
        type: "string",
        example: "a"
      }
      const result = JsonSchema.fromSchemaOpenApi3_0(input)
      deepStrictEqual(result, {
        dialect: "draft-2020-12",
        schema: {
          type: "string",
          examples: ["a"]
        },
        definitions: {}
      })
    })

    it("prefers examples over a singular example", () => {
      assertFromSchemaOpenApi3_0(
        {
          type: "string",
          example: "ignored",
          examples: ["kept"]
        },
        {
          schema: {
            type: "string",
            examples: ["kept"]
          }
        }
      )
    })

    type OpenApi3_0Case = {
      readonly name: string
      readonly input: JsonSchema.JsonSchema
      readonly expected: JsonSchema.JsonSchema
    }

    function testOpenApi3_0Cases(cases: ReadonlyArray<OpenApi3_0Case>): void {
      for (const { expected, input, name } of cases) {
        it(name, () => assertFromSchemaOpenApi3_0(input, { schema: expected }))
      }
    }

    describe("nullable", () => {
      testOpenApi3_0Cases([
        {
          name: "expands a schema without other keywords to anyOf",
          input: { nullable: true },
          expected: { anyOf: [{}, { type: "null" }] }
        },
        {
          name: "adds null to a string type",
          input: { type: "string", nullable: true },
          expected: { type: ["string", "null"] }
        },
        {
          name: "adds null to a type array",
          input: { type: ["string", "number"], nullable: true },
          expected: { type: ["string", "number", "null"] }
        },
        {
          name: "does not widen the null type",
          input: { type: "null", nullable: true },
          expected: { type: "null" }
        },
        {
          name: "does not duplicate null in a type array",
          input: { type: ["string", "null"], nullable: true },
          expected: { type: ["string", "null"] }
        },
        {
          name: "leaves a malformed type unchanged",
          input: { type: 1, nullable: true },
          expected: { type: 1 }
        },
        {
          name: "keeps a non-null const while adding null to the type",
          input: { type: "string", const: "a", nullable: true },
          expected: { type: ["string", "null"], const: "a" }
        },
        {
          name: "wraps a non-null const in anyOf when type is absent",
          input: { const: "a", nullable: true },
          expected: { anyOf: [{ const: "a" }, { type: "null" }] }
        },
        {
          name: "keeps a null const without adding anyOf",
          input: { const: null, nullable: true },
          expected: { const: null }
        },
        {
          name: "adds null to enum values and type",
          input: { type: "string", enum: ["a", "b"], nullable: true },
          expected: { type: ["string", "null"], enum: ["a", "b", null] }
        },
        {
          name: "does not duplicate null in enum values",
          input: { type: "string", enum: ["a", "b", null], nullable: true },
          expected: { type: ["string", "null"], enum: ["a", "b", null] }
        },
        {
          name: "preserves enum when null is its only value",
          input: { type: "string", enum: [null], nullable: true },
          expected: { type: ["string", "null"], enum: [null] }
        },
        {
          name: "uses anyOf for schemas without type",
          input: { nullable: true, minimum: 0 },
          expected: { anyOf: [{ minimum: 0 }, { type: "null" }] }
        },
        {
          name: "drops nullable false",
          input: { type: "string", nullable: false },
          expected: { type: "string" }
        },
        {
          name: "normalizes nullable inside allOf independently from the parent",
          input: { type: "string", allOf: [{ nullable: true }] },
          expected: {
            type: "string",
            allOf: [{ anyOf: [{}, { type: "null" }] }]
          }
        },
        {
          name: "normalizes nullable on both a parent and its allOf member",
          input: { type: "string", nullable: true, allOf: [{ nullable: true }] },
          expected: {
            type: ["string", "null"],
            allOf: [{ anyOf: [{}, { type: "null" }] }]
          }
        }
      ])
    })

    describe("exclusivity", () => {
      testOpenApi3_0Cases([
        {
          name: "turns exclusiveMinimum true into the minimum value",
          input: { type: "number", minimum: 10, exclusiveMinimum: true },
          expected: { type: "number", exclusiveMinimum: 10 }
        },
        {
          name: "turns exclusiveMaximum true into the maximum value",
          input: { type: "number", maximum: 100, exclusiveMaximum: true },
          expected: { type: "number", exclusiveMaximum: 100 }
        },
        {
          name: "drops exclusiveMinimum false",
          input: { type: "number", minimum: 10, exclusiveMinimum: false },
          expected: { type: "number", minimum: 10 }
        },
        {
          name: "drops exclusiveMaximum false",
          input: { type: "number", maximum: 100, exclusiveMaximum: false },
          expected: { type: "number", maximum: 100 }
        },
        {
          name: "drops exclusiveMinimum true when minimum is absent",
          input: { type: "number", exclusiveMinimum: true },
          expected: { type: "number" }
        },
        {
          name: "drops exclusiveMaximum true when maximum is absent",
          input: { type: "number", exclusiveMaximum: true },
          expected: { type: "number" }
        }
      ])
    })
  })

  describe("toDocumentDraft07", () => {
    it("preserves Schema.Never", () => {
      const result = JsonSchema.toDocumentDraft07(Schema.toJsonSchemaDocument(Schema.Never))
      deepStrictEqual(result, {
        dialect: "draft-07",
        schema: { not: {} },
        definitions: {}
      })
    })

    it("omits an empty required array", () => {
      const document = JsonSchema.toDocumentDraft07({
        dialect: "draft-2020-12",
        schema: { type: "object", required: [] },
        definitions: {}
      })

      deepStrictEqual(document.schema, { type: "object" })
    })

    it("preserves every supported annotation and validation keyword", () => {
      const schema: JsonSchema.JsonSchema = {
        type: "object",
        required: ["value"],
        enum: ["a", "b"],
        const: "a",
        title: "title",
        description: "description",
        default: "a",
        examples: ["a"],
        format: "custom",
        readOnly: true,
        writeOnly: true,
        pattern: "^a$",
        minimum: 0,
        maximum: 10,
        exclusiveMinimum: 0,
        exclusiveMaximum: 10,
        minLength: 1,
        maxLength: 10,
        minItems: 1,
        maxItems: 10,
        minProperties: 1,
        maxProperties: 10,
        multipleOf: 2,
        uniqueItems: true,
        properties: { value: { type: "string" } },
        patternProperties: { "^x-": { type: "string" } },
        not: { type: "null" },
        additionalProperties: false,
        propertyNames: { minLength: 1 },
        allOf: [{ type: "object" }],
        anyOf: [{ type: "string" }],
        oneOf: [{ type: "number" }],
        items: { type: "string" }
      }

      deepStrictEqual(
        JsonSchema.toDocumentDraft07({
          dialect: "draft-2020-12",
          schema,
          definitions: {}
        }).schema,
        schema
      )
    })

    it("preserves validation semantics", () => {
      const document = JsonSchema.toDocumentDraft07({
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            mode: { const: "on" },
            value: { type: "number", exclusiveMinimum: 0 },
            tuple: { type: "array", prefixItems: [{ type: "string" }], items: false }
          },
          required: ["mode", "value", "tuple"],
          additionalProperties: false
        },
        definitions: {}
      })
      const schema = makeSchema(document)
      deepStrictEqual(ajvDraft07.validateSchema(schema), true)

      const validate = ajvDraft07.compile(schema)
      deepStrictEqual(validate({ mode: "on", value: 1, tuple: ["a"] }), true)
      deepStrictEqual(validate({ mode: "off", value: 1, tuple: ["a"] }), false)
      deepStrictEqual(validate({ mode: "on", value: 0, tuple: ["a"] }), false)
      deepStrictEqual(validate({ mode: "on", value: 1, tuple: ["a", "b"] }), false)
    })

    it("rewrites $defs refs to Draft-07 definitions refs", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            a: { $ref: "#/$defs/A" },
            b: { $ref: "#/$defs/B" }
          }
        },
        definitions: {
          A: {
            type: "string",
            $ref: "#/$defs/B"
          },
          B: {
            type: "number"
          }
        }
      }
      const result = JsonSchema.toDocumentDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-07",
        schema: {
          type: "object",
          properties: {
            a: { $ref: "#/definitions/A" },
            b: { $ref: "#/definitions/B" }
          }
        },
        definitions: {
          A: {
            type: "string",
            allOf: [{ $ref: "#/definitions/B" }]
          },
          B: {
            type: "number"
          }
        }
      })
    })

    it("rewrites refs only in schema positions", () => {
      const literal = { $ref: "#/$defs/Literal" }
      const result = JsonSchema.toDocumentDraft07({
        dialect: "draft-2020-12",
        schema: {
          properties: { value: { $ref: "#/$defs/Value" } },
          const: literal,
          enum: [literal],
          default: literal,
          examples: [literal]
        },
        definitions: { Value: { type: "string" } }
      })

      deepStrictEqual(result, {
        dialect: "draft-07",
        schema: {
          properties: { value: { $ref: "#/definitions/Value" } },
          const: literal,
          enum: [literal],
          default: literal,
          examples: [literal]
        },
        definitions: { Value: { type: "string" } }
      })
    })

    it("preserves constraints next to refs and existing allOf", () => {
      const document = JsonSchema.toDocumentDraft07({
        dialect: "draft-2020-12",
        schema: {
          $ref: "#/$defs/S",
          minLength: 3,
          allOf: [{ maxLength: 5 }]
        },
        definitions: { S: { type: "string" } }
      })

      deepStrictEqual(document.schema, {
        minLength: 3,
        allOf: [
          { $ref: "#/definitions/S" },
          { maxLength: 5 }
        ]
      })

      const schema = makeSchema(document)
      deepStrictEqual(ajvDraft07.validateSchema(schema), true)
      const validate = ajvDraft07.compile(schema)
      deepStrictEqual(validate("abc"), true)
      deepStrictEqual(validate("a"), false)
      deepStrictEqual(validate("abcdef"), false)
    })

    it("converts prefixItems to a Draft-07 items tuple", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "array",
          prefixItems: [
            { type: "string" },
            { type: "number" }
          ],
          items: { type: "boolean" }
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-07",
        schema: {
          type: "array",
          items: [
            { type: "string" },
            { type: "number" }
          ],
          additionalItems: { type: "boolean" }
        },
        definitions: {}
      })
    })

    it("preserves a single items schema as items", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "array",
          items: { type: "string" }
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-07",
        schema: {
          type: "array",
          items: { type: "string" }
        },
        definitions: {}
      })
    })

    it("drops non-standard properties in Draft-07 output", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "string",
          "x-custom": "value"
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft07(input)
      deepStrictEqual(result, {
        dialect: "draft-07",
        schema: {
          type: "string"
        },
        definitions: {}
      })
    })

    it("preserves malformed values for recognized keywords", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          $ref: 1,
          properties: "invalid",
          not: [false, { type: "string" }],
          allOf: "invalid",
          prefixItems: "invalid"
        },
        definitions: {}
      }

      deepStrictEqual(JsonSchema.toDocumentDraft07(input), {
        dialect: "draft-07",
        schema: {
          $ref: 1,
          properties: "invalid",
          not: [false, { type: "string" }],
          allOf: "invalid",
          items: "invalid"
        },
        definitions: {}
      })
    })
  })

  describe("toDocumentDraft04", () => {
    it("rewrites $defs refs to Draft-04 definitions refs", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            value: { $ref: "#/$defs/Value" }
          }
        },
        definitions: {
          Value: { type: "string" }
        }
      }
      const result = JsonSchema.toDocumentDraft04(input)
      deepStrictEqual(result, {
        dialect: "draft-04",
        schema: {
          type: "object",
          properties: {
            value: { $ref: "#/definitions/Value" }
          }
        },
        definitions: {
          Value: { type: "string" }
        }
      })
    })

    it("preserves every supported Draft-04 keyword and drops newer annotations", () => {
      const input: JsonSchema.JsonSchema = {
        type: "object",
        required: ["value"],
        enum: ["a", "b"],
        title: "title",
        description: "description",
        default: "a",
        format: "custom",
        pattern: "^a$",
        minimum: 0,
        maximum: 10,
        minLength: 1,
        maxLength: 10,
        minItems: 1,
        maxItems: 10,
        minProperties: 1,
        maxProperties: 10,
        multipleOf: 2,
        uniqueItems: true,
        properties: { value: { type: "string" } },
        patternProperties: { "^x-": { type: "string" } },
        not: { type: "null" },
        additionalProperties: false,
        allOf: [{ type: "object" }],
        anyOf: [{ type: "string" }],
        oneOf: [{ type: "number" }],
        items: { type: "string" },
        examples: ["a"],
        readOnly: true,
        writeOnly: true,
        propertyNames: { minLength: 1 }
      }
      const expected: JsonSchema.JsonSchema = {
        type: "object",
        required: ["value"],
        enum: ["a", "b"],
        title: "title",
        description: "description",
        default: "a",
        format: "custom",
        pattern: "^a$",
        minimum: 0,
        maximum: 10,
        minLength: 1,
        maxLength: 10,
        minItems: 1,
        maxItems: 10,
        minProperties: 1,
        maxProperties: 10,
        multipleOf: 2,
        uniqueItems: true,
        properties: { value: { type: "string" } },
        patternProperties: { "^x-": { type: "string" } },
        not: { type: "null" },
        additionalProperties: false,
        allOf: [{ type: "object" }],
        anyOf: [{ type: "string" }],
        oneOf: [{ type: "number" }],
        items: { type: "string" }
      }

      deepStrictEqual(
        JsonSchema.toDocumentDraft04({
          dialect: "draft-2020-12",
          schema: input,
          definitions: {}
        }).schema,
        expected
      )
    })

    it("omits an empty required array", () => {
      const document = JsonSchema.toDocumentDraft04({
        dialect: "draft-2020-12",
        schema: { type: "object", required: [] },
        definitions: {}
      })

      deepStrictEqual(document.schema, { type: "object" })
      deepStrictEqual(ajvDraft04.validateSchema(makeSchema(document)), true)
    })

    it("converts const to enum", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          enum: ["a", "b"],
          const: "b",
          allOf: [{ type: "string" }]
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft04(input)
      deepStrictEqual(result.schema, {
        enum: ["a", "b"],
        allOf: [{ type: "string" }, { enum: ["b"] }]
      })

      deepStrictEqual(
        JsonSchema.toDocumentDraft04({
          dialect: "draft-2020-12",
          schema: { const: "a" },
          definitions: {}
        }).schema,
        { enum: ["a"] }
      )

      deepStrictEqual(
        JsonSchema.toDocumentDraft04({
          dialect: "draft-2020-12",
          schema: { enum: ["a", "b"], const: "b" },
          definitions: {}
        }).schema,
        { enum: ["a", "b"], allOf: [{ enum: ["b"] }] }
      )
    })

    it("preserves refs in literal values", () => {
      const literal = { $ref: "#/$defs/Literal" }

      deepStrictEqual(
        JsonSchema.toDocumentDraft04({
          dialect: "draft-2020-12",
          schema: { const: literal },
          definitions: {}
        }).schema,
        { enum: [literal] }
      )
      deepStrictEqual(
        JsonSchema.toDocumentDraft04({
          dialect: "draft-2020-12",
          schema: { enum: [literal], default: literal },
          definitions: {}
        }).schema,
        { enum: [literal], default: literal }
      )
    })

    it("converts numeric exclusive bounds to Draft-04 boolean exclusivity", () => {
      const cases: ReadonlyArray<readonly [JsonSchema.JsonSchema, JsonSchema.JsonSchema]> = [
        [{ minimum: 1 }, { minimum: 1 }],
        [{ exclusiveMinimum: 1 }, { minimum: 1, exclusiveMinimum: true }],
        [{ minimum: 2, exclusiveMinimum: 1 }, { minimum: 2 }],
        [{ minimum: 1, exclusiveMinimum: 1 }, { minimum: 1, exclusiveMinimum: true }],
        [{ minimum: 1, exclusiveMinimum: 2 }, { minimum: 2, exclusiveMinimum: true }],
        [{ maximum: 2 }, { maximum: 2 }],
        [{ exclusiveMaximum: 2 }, { maximum: 2, exclusiveMaximum: true }],
        [{ maximum: 1, exclusiveMaximum: 2 }, { maximum: 1 }],
        [{ maximum: 2, exclusiveMaximum: 2 }, { maximum: 2, exclusiveMaximum: true }],
        [{ maximum: 2, exclusiveMaximum: 1 }, { maximum: 1, exclusiveMaximum: true }]
      ]
      for (const [schema, expected] of cases) {
        deepStrictEqual(
          JsonSchema.toDocumentDraft04({
            dialect: "draft-2020-12",
            schema,
            definitions: {}
          }).schema,
          expected
        )
      }
    })

    it("converts boolean schemas only in schema positions", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            allowed: true,
            denied: false,
            nested: { not: false }
          },
          additionalProperties: false,
          allOf: [true],
          anyOf: [false]
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft04(input)
      deepStrictEqual(result.schema, {
        type: "object",
        properties: {
          allowed: {},
          denied: { not: {} },
          nested: { not: { not: {} } }
        },
        additionalProperties: false,
        allOf: [{}],
        anyOf: [{ not: {} }]
      })
    })

    it("converts tuple members while preserving additionalItems booleans", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "array",
          prefixItems: [true, false],
          items: false
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft04(input)
      deepStrictEqual(result.schema, {
        type: "array",
        items: [{}, { not: {} }],
        additionalItems: false
      })

      deepStrictEqual(
        JsonSchema.toDocumentDraft04({
          dialect: "draft-2020-12",
          schema: { type: "array", items: false },
          definitions: {}
        }).schema,
        { type: "array", items: { not: {} } }
      )
    })

    it("converts schemas in additionalProperties and additionalItems", () => {
      const result = JsonSchema.toDocumentDraft04({
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          additionalProperties: { const: "value" },
          properties: {
            tuple: {
              type: "array",
              prefixItems: [{ type: "string" }],
              items: { const: "rest" }
            }
          }
        },
        definitions: {}
      })

      deepStrictEqual(result.schema, {
        type: "object",
        additionalProperties: { enum: ["value"] },
        properties: {
          tuple: {
            type: "array",
            items: [{ type: "string" }],
            additionalItems: { enum: ["rest"] }
          }
        }
      })
    })

    it("preserves malformed values for recognized keywords", () => {
      const result = JsonSchema.toDocumentDraft04({
        dialect: "draft-2020-12",
        schema: {
          properties: "invalid",
          not: [1],
          allOf: "invalid"
        },
        definitions: {}
      })

      deepStrictEqual(result.schema, {
        properties: "invalid",
        not: [1],
        allOf: "invalid"
      })
    })

    it("preserves allOf, not, and null", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          anyOf: [
            { type: "null" },
            { allOf: [{ not: { type: "string" } }] }
          ]
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft04(input)
      deepStrictEqual(result.schema, input.schema)
    })

    it("drops keywords unavailable in Draft-04", () => {
      const input: JsonSchema.Document<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          propertyNames: { pattern: "^[a-z]+$" },
          examples: [{ value: 1 }]
        },
        definitions: {}
      }
      const result = JsonSchema.toDocumentDraft04(input)
      deepStrictEqual(result.schema, { type: "object" })
    })

    it("preserves constraints next to refs", () => {
      const document = JsonSchema.toDocumentDraft04({
        dialect: "draft-2020-12",
        schema: { $ref: "#/$defs/S", minLength: 3 },
        definitions: { S: { type: "string" } }
      })

      deepStrictEqual(document.schema, {
        allOf: [{ $ref: "#/definitions/S" }],
        minLength: 3
      })

      const schema = makeSchema(document)
      deepStrictEqual(ajvDraft04.validateSchema(schema), true)
      const validate = ajvDraft04.compile(schema)
      deepStrictEqual(validate("abc"), true)
      deepStrictEqual(validate("a"), false)
    })

    it("preserves validation semantics for converted constraints", () => {
      const document = JsonSchema.toDocumentDraft04({
        dialect: "draft-2020-12",
        schema: {
          type: "object",
          properties: {
            mode: { const: "on" },
            value: { type: "number", exclusiveMinimum: 0, exclusiveMaximum: 2 },
            tuple: { type: "array", prefixItems: [{ type: "string" }], items: false }
          },
          required: ["mode", "value", "tuple"],
          additionalProperties: false
        },
        definitions: {}
      })
      const schema = makeSchema(document)
      deepStrictEqual(ajvDraft04.validateSchema(schema), true)

      const validate = ajvDraft04.compile(schema)
      deepStrictEqual(validate({ mode: "on", value: 1, tuple: ["a"] }), true)
      deepStrictEqual(validate({ mode: "off", value: 1, tuple: ["a"] }), false)
      deepStrictEqual(validate({ mode: "on", value: 0, tuple: ["a"] }), false)
      deepStrictEqual(validate({ mode: "on", value: 1, tuple: ["a", "b"] }), false)
    })

    it("converts documents generated from Effect schemas", () => {
      const shared = Schema.Struct({ value: Schema.String })
      const schema = Schema.Struct({
        mode: Schema.Literal("enabled"),
        threshold: Schema.Finite.check(Schema.isGreaterThan(0)),
        tuple: Schema.Tuple([Schema.String, Schema.Boolean]),
        left: shared,
        right: shared
      })
      const document = JsonSchema.toDocumentDraft04(Schema.toJsonSchemaDocument(schema))
      const draft04 = makeSchema(document)
      deepStrictEqual(ajvDraft04.validateSchema(draft04), true)

      const validate = ajvDraft04.compile(draft04)
      const valid = {
        mode: "enabled",
        threshold: 1,
        tuple: ["a", true],
        left: { value: "left" },
        right: { value: "right" }
      }
      deepStrictEqual(validate(valid), true)
      deepStrictEqual(validate({ ...valid, threshold: 0 }), false)
      deepStrictEqual(validate({ ...valid, tuple: ["a", true, false] }), false)
    })
  })

  describe("toMultiDocumentOpenApi3_1", () => {
    it("rewrites `$defs` references to `components/schemas`", () => {
      const input: JsonSchema.MultiDocument<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schemas: [
          {
            type: "object",
            properties: {
              a: { $ref: "#/$defs/A" },
              b: { $ref: "#/$defs/B" }
            }
          }
        ],
        definitions: {
          A: {
            type: "string",
            $ref: "#/$defs/B"
          },
          B: {
            type: "number"
          }
        }
      }
      const result = JsonSchema.toMultiDocumentOpenApi3_1(input)
      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [
          {
            type: "object",
            properties: {
              a: { $ref: "#/components/schemas/A" },
              b: { $ref: "#/components/schemas/B" }
            }
          }
        ],
        definitions: {
          A: {
            type: "string",
            $ref: "#/components/schemas/B"
          },
          B: {
            type: "number"
          }
        }
      })
    })

    it("rewrites refs only in schema positions", () => {
      const literal = { $ref: "#/$defs/Literal" }
      const result = JsonSchema.toMultiDocumentOpenApi3_1({
        dialect: "draft-2020-12",
        schemas: [{
          properties: { value: { $ref: "#/$defs/Value" } },
          const: literal,
          enum: [literal],
          default: literal,
          examples: [literal]
        }],
        definitions: { Value: { type: "string" } }
      })

      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [{
          properties: { value: { $ref: "#/components/schemas/Value" } },
          const: literal,
          enum: [literal],
          default: literal,
          examples: [literal]
        }],
        definitions: { Value: { type: "string" } }
      })
    })

    it("sanitizes component schema keys and rewritten refs together", () => {
      const input: JsonSchema.MultiDocument<"draft-2020-12"> = {
        dialect: "draft-2020-12",
        schemas: [
          {
            type: "object",
            properties: {
              "A.B": { "$ref": "#/$defs/A$B" }
            }
          }
        ],
        definitions: {
          "A$B": { "$ref": "#/$defs/B$C" },
          "B$C": { type: "string" }
        }
      }
      const result = JsonSchema.toMultiDocumentOpenApi3_1(input)
      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [
          {
            type: "object",
            properties: {
              "A.B": { "$ref": "#/components/schemas/A_B" }
            }
          }
        ],
        definitions: {
          "A_B": { "$ref": "#/components/schemas/B_C" },
          "B_C": { type: "string" }
        }
      })
    })

    it("unescapes a definition key before sanitizing its ref", () => {
      const result = JsonSchema.toMultiDocumentOpenApi3_1({
        dialect: "draft-2020-12",
        schemas: [{ $ref: "#/$defs/A~1B" }],
        definitions: {
          "A/B": { type: "string" }
        }
      })

      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [{ $ref: "#/components/schemas/A_B" }],
        definitions: {
          A_B: { type: "string" }
        }
      })
    })

    it("suffixes a sanitized key that collides with a valid key", () => {
      const result = JsonSchema.toMultiDocumentOpenApi3_1({
        dialect: "draft-2020-12",
        schemas: [
          {
            allOf: [
              { $ref: "#/$defs/A_B" },
              { $ref: "#/$defs/A~1B" }
            ]
          }
        ],
        definitions: {
          A_B: { type: "string" },
          "A/B": { type: "number" }
        }
      })

      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [
          {
            allOf: [
              { $ref: "#/components/schemas/A_B" },
              { $ref: "#/components/schemas/A_B_1" }
            ]
          }
        ],
        definitions: {
          A_B: { type: "string" },
          A_B_1: { type: "number" }
        }
      })
    })

    it("allocates suffixes deterministically and skips occupied keys", () => {
      const convert = (definitions: JsonSchema.Definitions) =>
        JsonSchema.toMultiDocumentOpenApi3_1({
          dialect: "draft-2020-12",
          schemas: [
            {
              allOf: [
                { $ref: "#/$defs/A_B" },
                { $ref: "#/$defs/A_B_1" },
                { $ref: "#/$defs/A~1B" },
                { $ref: "#/$defs/A?B" }
              ]
            }
          ],
          definitions
        })
      const expected: JsonSchema.MultiDocument<"openapi-3.1"> = {
        dialect: "openapi-3.1",
        schemas: [
          {
            allOf: [
              { $ref: "#/components/schemas/A_B" },
              { $ref: "#/components/schemas/A_B_1" },
              { $ref: "#/components/schemas/A_B_2" },
              { $ref: "#/components/schemas/A_B_3" }
            ]
          }
        ],
        definitions: {
          A_B: { type: "string" },
          A_B_1: { type: "boolean" },
          A_B_2: { type: "number" },
          A_B_3: { type: "null" }
        }
      }

      deepStrictEqual(
        convert({
          "A?B": { type: "null" },
          A_B_1: { type: "boolean" },
          "A/B": { type: "number" },
          A_B: { type: "string" }
        }),
        expected
      )
      deepStrictEqual(
        convert({
          A_B: { type: "string" },
          "A/B": { type: "number" },
          A_B_1: { type: "boolean" },
          "A?B": { type: "null" }
        }),
        expected
      )
    })

    it("reserves sanitized bases before allocating suffixes", () => {
      const result = JsonSchema.toMultiDocumentOpenApi3_1({
        dialect: "draft-2020-12",
        schemas: [
          {
            allOf: [
              { $ref: "#/$defs/A~1B" },
              { $ref: "#/$defs/A?B" },
              { $ref: "#/$defs/A?B?1" }
            ]
          }
        ],
        definitions: {
          "A/B": { type: "number" },
          "A?B": { type: "string" },
          "A?B?1": { type: "boolean" }
        }
      })

      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [
          {
            allOf: [
              { $ref: "#/components/schemas/A_B" },
              { $ref: "#/components/schemas/A_B_2" },
              { $ref: "#/components/schemas/A_B_1" }
            ]
          }
        ],
        definitions: {
          A_B: { type: "number" },
          A_B_2: { type: "string" },
          A_B_1: { type: "boolean" }
        }
      })
    })

    it("rewrites nested definition refs without changing other refs", () => {
      const result = JsonSchema.toMultiDocumentOpenApi3_1({
        dialect: "draft-2020-12",
        schemas: [
          {
            allOf: [
              { $ref: "#/$defs/A~1B/properties/value" },
              { $ref: "https://example.com/schema#/$defs/A~1B" },
              { $ref: "#/other/A~1B" }
            ]
          }
        ],
        definitions: {
          "A/B": {
            type: "object",
            properties: { value: { type: "string" } }
          }
        }
      })

      deepStrictEqual(result, {
        dialect: "openapi-3.1",
        schemas: [
          {
            allOf: [
              { $ref: "#/components/schemas/A_B/properties/value" },
              { $ref: "https://example.com/schema#/$defs/A~1B" },
              { $ref: "#/other/A~1B" }
            ]
          }
        ],
        definitions: {
          A_B: {
            type: "object",
            properties: { value: { type: "string" } }
          }
        }
      })
    })
  })

  describe("input immutability", () => {
    const schema: JsonSchema.JsonSchema = {
      type: "object",
      properties: {
        value: {
          type: "array",
          prefixItems: [{ type: "string" }],
          items: false,
          nullable: true
        }
      },
      $defs: {
        Value: { type: "string" }
      }
    }

    for (
      const [name, convert] of [
        ["fromSchemaDraft07", JsonSchema.fromSchemaDraft07],
        ["fromSchemaDraft2020_12", JsonSchema.fromSchemaDraft2020_12],
        ["fromSchemaOpenApi3_1", JsonSchema.fromSchemaOpenApi3_1],
        ["fromSchemaOpenApi3_0", JsonSchema.fromSchemaOpenApi3_0]
      ] as const
    ) {
      it(`${name} does not mutate its input`, () => {
        assertDoesNotMutate(structuredClone(schema), convert)
      })
    }

    for (
      const [name, convert] of [
        ["toDocumentDraft07", JsonSchema.toDocumentDraft07],
        ["toDocumentDraft04", JsonSchema.toDocumentDraft04]
      ] as const
    ) {
      it(`${name} does not mutate its input`, () => {
        assertDoesNotMutate(
          {
            dialect: "draft-2020-12",
            schema: structuredClone(schema),
            definitions: { Value: { type: "string" } }
          },
          convert
        )
      })
    }

    it("toMultiDocumentOpenApi3_1 does not mutate its input", () => {
      assertDoesNotMutate(
        {
          dialect: "draft-2020-12",
          schemas: [structuredClone(schema)] as const,
          definitions: { Value: { type: "string" } }
        },
        JsonSchema.toMultiDocumentOpenApi3_1
      )
    })
  })

  describe("roundtrip conversions", () => {
    it("preserves a Draft-07 schema and definitions through canonical form", () => {
      const original: JsonSchema.JsonSchema = {
        type: "object",
        readOnly: true,
        writeOnly: true,
        not: { required: ["forbidden"] },
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: [
              { type: "string" },
              { type: "number" }
            ],
            additionalItems: { type: "boolean" }
          },
          ref: {
            $ref: "#/definitions/MyType"
          }
        },
        definitions: {
          MyType: {
            type: "string"
          }
        }
      }

      const to2020_12 = JsonSchema.fromSchemaDraft07(original)
      const backTo07 = JsonSchema.toDocumentDraft07(to2020_12)

      deepStrictEqual(backTo07.schema, {
        type: "object",
        readOnly: true,
        writeOnly: true,
        not: { required: ["forbidden"] },
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: [
              { type: "string" },
              { type: "number" }
            ],
            additionalItems: { type: "boolean" }
          },
          ref: {
            $ref: "#/definitions/MyType"
          }
        }
      })
      deepStrictEqual(backTo07.definitions, {
        MyType: {
          type: "string"
        }
      })
    })
  })
})
