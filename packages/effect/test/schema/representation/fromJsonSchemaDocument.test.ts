import { JsonSchema, Schema, SchemaRepresentation } from "effect"
import { describe, it } from "vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "../../utils/assert.ts"
import { canonicalize } from "./testUtils.ts"

function toSchemaFromJsonSchemaDocument(
  document: JsonSchema.Document<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): Schema.Top {
  return SchemaRepresentation.fromJsonSchemaDocument(document, options)
}

function fromJsonSchemaRepresentation(
  document: JsonSchema.Document<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): SchemaRepresentation.Document {
  return SchemaRepresentation.fromAST(SchemaRepresentation.fromJsonSchemaDocument(document, options).ast)
}

function omitDefaultExpected(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(omitDefaultExpected)
  if (typeof input !== "object" || input === null || Object.getPrototypeOf(input) !== Object.prototype) return input
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === "expected") continue
    const normalized = omitDefaultExpected(value)
    if (
      key === "annotations" && typeof normalized === "object" && normalized !== null &&
      Object.keys(normalized).length === 0
    ) continue
    out[key] = normalized
  }
  return out
}

const json = (annotations?: Schema.Annotations.Annotations) => {
  const representation = SchemaRepresentation.fromAST(Schema.Json.ast).representation
  return annotations === undefined
    ? representation
    : {
      ...representation,
      annotations: {
        ...("annotations" in representation ? representation.annotations : undefined),
        ...annotations
      }
    }
}

describe("fromJsonSchemaDocument", () => {
  function assertFromJsonSchema(
    input: {
      readonly schema: JsonSchema.JsonSchema
      readonly options?: SchemaRepresentation.FromJsonSchemaOptions
    },
    expected: {
      readonly representation: unknown
      readonly references?: Record<string, unknown>
    },
    runtime?: string
  ) {
    const expectedDocument = {
      representation: expected.representation,
      references: expected.references ?? {}
    }
    const jsonDocument = JsonSchema.fromSchemaDraft2020_12(input.schema)
    const schema = SchemaRepresentation.fromJsonSchemaDocument(jsonDocument, input.options)
    const document = SchemaRepresentation.fromAST(schema.ast)
    const actual = omitDefaultExpected(canonicalize(document)) as { readonly representation: unknown }
    const expectedRepresentation = omitDefaultExpected(canonicalize(expectedDocument)) as {
      readonly representation: unknown
    }
    deepStrictEqual(actual.representation, expectedRepresentation.representation)
    if (runtime !== undefined) {
      const live = SchemaRepresentation.fromAST(schema.ast)
      const code = SchemaRepresentation.toCodeDocument(SchemaRepresentation.toMultiDocument(live))
      const omitExpected = (value: string) =>
        value
          .replaceAll(/"expected": "(?:\\.|[^"\\])*"(?:, )?/g, "")
          .replaceAll(", }", " }")
          .replaceAll(".annotate({  })", "")
      strictEqual(omitExpected(code.codes[0].runtime), omitExpected(runtime))
    }
    return schema
  }

  it("{}", () => {
    assertFromJsonSchema(
      { schema: {} },
      {
        representation: json()
      },
      "Schema.Json"
    )
    assertFromJsonSchema(
      {
        schema: {
          title: "a",
          description: "b",
          default: "c",
          examples: ["d"],
          readOnly: true,
          writeOnly: true
        }
      },
      {
        representation: json({
          title: "a",
          description: "b",
          default: "c",
          examples: ["d"],
          readOnly: true,
          writeOnly: true
        })
      },
      `Schema.Json.annotate({ "title": "a", "description": "b", "default": "c", "examples": ["d"], "readOnly": true, "writeOnly": true })`
    )
  })

  describe("const", () => {
    it("const: literal (string)", () => {
      assertFromJsonSchema(
        { schema: { const: "a" } },
        {
          representation: { _tag: "Literal", literal: "a" }
        },
        `Schema.Literal("a")`
      )
      assertFromJsonSchema(
        { schema: { const: "a", description: "a" } },
        {
          representation: { _tag: "Literal", literal: "a", annotations: { description: "a" } }
        },
        `Schema.Literal("a").annotate({ "description": "a" })`
      )
    })

    it("const: literal (number)", () => {
      assertFromJsonSchema(
        { schema: { const: 1 } },
        {
          representation: { _tag: "Literal", literal: 1 }
        },
        `Schema.Literal(1)`
      )
    })

    it("const: literal (boolean)", () => {
      assertFromJsonSchema(
        { schema: { const: true } },
        {
          representation: { _tag: "Literal", literal: true }
        },
        `Schema.Literal(true)`
      )
    })

    it("const: null", () => {
      assertFromJsonSchema(
        { schema: { const: null } },
        {
          representation: { _tag: "Null" }
        },
        `Schema.Null`
      )
      assertFromJsonSchema(
        { schema: { const: null, description: "a" } },
        {
          representation: { _tag: "Null", annotations: { description: "a" } }
        },
        `Schema.Null.annotate({ "description": "a" })`
      )
    })

    it("const: non-literal", () => {
      assertFromJsonSchema(
        { schema: { const: {} } },
        {
          representation: json()
        },
        `Schema.Json`
      )
    })
  })

  describe("enum", () => {
    it("single enum (string)", () => {
      assertFromJsonSchema(
        { schema: { enum: ["a"] } },
        {
          representation: { _tag: "Literal", literal: "a" }
        },
        `Schema.Literal("a")`
      )
      assertFromJsonSchema(
        { schema: { enum: ["a"], description: "a" } },
        {
          representation: { _tag: "Literal", literal: "a", annotations: { description: "a" } }
        },
        `Schema.Literal("a").annotate({ "description": "a" })`
      )
    })

    it("single enum (number)", () => {
      assertFromJsonSchema(
        { schema: { enum: [1] } },
        {
          representation: { _tag: "Literal", literal: 1 }
        },
        `Schema.Literal(1)`
      )
    })

    it("single enum (boolean)", () => {
      assertFromJsonSchema(
        { schema: { enum: [true] } },
        {
          representation: { _tag: "Literal", literal: true }
        },
        `Schema.Literal(true)`
      )
    })

    it("multiple enum (literals)", () => {
      assertFromJsonSchema(
        { schema: { enum: ["a", 1] } },
        {
          representation: {
            _tag: "Union",
            types: [
              { _tag: "Literal", literal: "a" },
              { _tag: "Literal", literal: 1 }
            ],
            mode: "anyOf"
          }
        },
        `Schema.Literals(["a", 1])`
      )
      assertFromJsonSchema(
        { schema: { enum: ["a", 1], description: "a" } },
        {
          representation: {
            _tag: "Union",
            types: [
              { _tag: "Literal", literal: "a" },
              { _tag: "Literal", literal: 1 }
            ],
            mode: "anyOf",
            annotations: { description: "a" }
          }
        },
        `Schema.Literals(["a", 1]).annotate({ "description": "a" })`
      )
    })

    it("enum containing null", () => {
      assertFromJsonSchema(
        { schema: { enum: ["a", null] } },
        {
          representation: {
            _tag: "Union",
            types: [
              { _tag: "Literal", literal: "a" },
              { _tag: "Null" }
            ],
            mode: "anyOf"
          }
        },
        `Schema.Union([Schema.Literal("a"), Schema.Null])`
      )
    })
  })

  it("anyOf", () => {
    assertFromJsonSchema(
      { schema: { anyOf: [{ const: "a" }, { enum: [1, 2] }] } },
      {
        representation: {
          _tag: "Union",
          types: [
            { _tag: "Literal", literal: "a" },
            {
              _tag: "Union",
              types: [
                { _tag: "Literal", literal: 1 },
                { _tag: "Literal", literal: 2 }
              ],
              mode: "anyOf"
            }
          ],
          mode: "anyOf"
        }
      },
      `Schema.Union([Schema.Literal("a"), Schema.Literals([1, 2])])`
    )
  })

  it("anyOf with siblings", () => {
    assertFromJsonSchema(
      {
        schema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
          anyOf: [
            { properties: { a: { type: "string" } }, required: ["a"] },
            { properties: { b: { type: "number" } }, required: ["b"] }
          ]
        }
      },
      {
        representation: {
          _tag: "Union",
          types: [
            {
              _tag: "Objects",
              propertySignatures: [
                { name: "a", isOptional: false, isMutable: false, type: { _tag: "String", checks: [] } },
                { name: "id", isOptional: false, isMutable: false, type: { _tag: "String", checks: [] } }
              ],
              indexSignatures: [{ parameter: { _tag: "String", checks: [] }, type: json() }],
              checks: []
            },
            {
              _tag: "Objects",
              propertySignatures: [
                {
                  name: "b",
                  isOptional: false,
                  isMutable: false,
                  type: {
                    _tag: "Number",
                    checks: [{ _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }]
                  }
                },
                { name: "id", isOptional: false, isMutable: false, type: { _tag: "String", checks: [] } }
              ],
              indexSignatures: [{ parameter: { _tag: "String", checks: [] }, type: json() }],
              checks: []
            }
          ],
          mode: "anyOf"
        }
      }
    )
  })

  it("oneOf", () => {
    assertFromJsonSchema(
      { schema: { oneOf: [{ const: "a" }, { enum: [1, 2] }] } },
      {
        representation: {
          _tag: "Union",
          types: [
            { _tag: "Literal", literal: "a" },
            {
              _tag: "Union",
              types: [
                { _tag: "Literal", literal: 1 },
                { _tag: "Literal", literal: 2 }
              ],
              mode: "anyOf"
            }
          ],
          mode: "oneOf"
        }
      },
      `Schema.Union([Schema.Literal("a"), Schema.Literals([1, 2])], { mode: "oneOf" })`
    )
  })

  it("oneOf with siblings", () => {
    assertFromJsonSchema(
      {
        schema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
          oneOf: [
            { properties: { a: { type: "string" } }, required: ["a"] },
            { properties: { b: { type: "number" } }, required: ["b"] }
          ]
        }
      },
      {
        representation: {
          _tag: "Union",
          types: [
            {
              _tag: "Objects",
              propertySignatures: [
                { name: "a", isOptional: false, isMutable: false, type: { _tag: "String", checks: [] } },
                { name: "id", isOptional: false, isMutable: false, type: { _tag: "String", checks: [] } }
              ],
              indexSignatures: [{ parameter: { _tag: "String", checks: [] }, type: json() }],
              checks: []
            },
            {
              _tag: "Objects",
              propertySignatures: [
                {
                  name: "b",
                  isOptional: false,
                  isMutable: false,
                  type: {
                    _tag: "Number",
                    checks: [{ _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }]
                  }
                },
                { name: "id", isOptional: false, isMutable: false, type: { _tag: "String", checks: [] } }
              ],
              indexSignatures: [{ parameter: { _tag: "String", checks: [] }, type: json() }],
              checks: []
            }
          ],
          mode: "oneOf"
        }
      }
    )
  })

  describe("type: null", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "null" } },
        {
          representation: { _tag: "Null" }
        },
        `Schema.Null`
      )
    })
  })

  describe("type: string", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "string" } },
        {
          representation: { _tag: "String", checks: [] }
        },
        `Schema.String`
      )
    })

    describe("checks", () => {
      it("minLength", () => {
        assertFromJsonSchema(
          { schema: { type: "string", minLength: 1 } },
          {
            representation: {
              _tag: "String",
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } }
              }]
            }
          },
          `Schema.String.check(Schema.isMinLength(1))`
        )
      })

      it("maxLength", () => {
        assertFromJsonSchema(
          { schema: { type: "string", maxLength: 1 } },
          {
            representation: {
              _tag: "String",
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 1 } }
              }]
            }
          },
          `Schema.String.check(Schema.isMaxLength(1))`
        )
      })

      it("pattern", () => {
        assertFromJsonSchema(
          { schema: { type: "string", pattern: "a*" } },
          {
            representation: {
              _tag: "String",
              checks: [
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isPattern", payload: { source: "a*", flags: "" } }
                }
              ]
            }
          },
          `Schema.String.check(Schema.isPattern(new RegExp("a*")))`
        )
        assertFromJsonSchema(
          { schema: { pattern: "a*" } },
          {
            representation: {
              _tag: "String",
              checks: [
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isPattern", payload: { source: "a*", flags: "" } }
                }
              ]
            }
          },
          `Schema.String.check(Schema.isPattern(new RegExp("a*")))`
        )
      })
    })
  })

  describe("type: number", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "number" } },
        {
          representation: {
            _tag: "Number",
            checks: [
              { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }
            ]
          }
        },
        `Schema.Number.check(Schema.isFinite())`
      )
    })

    describe("checks", () => {
      it("minimum", () => {
        assertFromJsonSchema(
          { schema: { type: "number", minimum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isGreaterThanOrEqualTo", payload: { minimum: 1 } }
                }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isGreaterThanOrEqualTo(1))`
        )
      })

      it("maximum", () => {
        assertFromJsonSchema(
          { schema: { type: "number", maximum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isLessThanOrEqualTo", payload: { maximum: 1 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isLessThanOrEqualTo(1))`
        )
      })

      it("exclusiveMinimum", () => {
        assertFromJsonSchema(
          { schema: { type: "number", exclusiveMinimum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isGreaterThan", payload: { exclusiveMinimum: 1 } }
                }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isGreaterThan(1))`
        )
      })

      it("exclusiveMaximum", () => {
        assertFromJsonSchema(
          { schema: { type: "number", exclusiveMaximum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isLessThan", payload: { exclusiveMaximum: 1 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isLessThan(1))`
        )
      })

      it("multipleOf", () => {
        assertFromJsonSchema(
          { schema: { type: "number", multipleOf: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isMultipleOf", payload: { divisor: 1 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isMultipleOf(1))`
        )
      })
    })
  })

  describe("type: integer", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "integer" } },
        {
          representation: {
            _tag: "Number",
            checks: [
              { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } }
            ]
          }
        },
        `Schema.Number.check(Schema.isInt())`
      )
    })

    describe("checks", () => {
      it("minimum", () => {
        assertFromJsonSchema(
          { schema: { type: "integer", minimum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isGreaterThanOrEqualTo", payload: { minimum: 1 } }
                }
              ]
            }
          },
          `Schema.Number.check(Schema.isInt()).check(Schema.isGreaterThanOrEqualTo(1))`
        )
      })

      it("maximum", () => {
        assertFromJsonSchema(
          { schema: { type: "integer", maximum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isLessThanOrEqualTo", payload: { maximum: 1 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isInt()).check(Schema.isLessThanOrEqualTo(1))`
        )
      })

      it("exclusiveMinimum", () => {
        assertFromJsonSchema(
          { schema: { type: "integer", exclusiveMinimum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isGreaterThan", payload: { exclusiveMinimum: 1 } }
                }
              ]
            }
          },
          `Schema.Number.check(Schema.isInt()).check(Schema.isGreaterThan(1))`
        )
      })

      it("exclusiveMaximum", () => {
        assertFromJsonSchema(
          { schema: { type: "integer", exclusiveMaximum: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isLessThan", payload: { exclusiveMaximum: 1 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isInt()).check(Schema.isLessThan(1))`
        )
      })

      it("multipleOf", () => {
        assertFromJsonSchema(
          { schema: { type: "integer", multipleOf: 1 } },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isMultipleOf", payload: { divisor: 1 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isInt()).check(Schema.isMultipleOf(1))`
        )
      })
    })
  })

  describe("type: boolean", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "boolean" } },
        {
          representation: { _tag: "Boolean" }
        },
        `Schema.Boolean`
      )
    })
  })

  describe("type: array", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "array" } },
        {
          representation: {
            _tag: "Arrays",
            elements: [],
            rest: [json()],
            checks: []
          }
        },
        `Schema.Array(Schema.Json)`
      )
    })

    it("items", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "array",
            items: { type: "string" }
          }
        },
        {
          representation: { _tag: "Arrays", elements: [], rest: [{ _tag: "String", checks: [] }], checks: [] }
        },
        `Schema.Array(Schema.String)`
      )
    })

    it("prefixItems", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "array",
            prefixItems: [{ type: "string" }],
            maxItems: 1
          }
        },
        {
          representation: {
            _tag: "Arrays",
            elements: [
              { isOptional: true, type: { _tag: "String", checks: [] } }
            ],
            rest: [],
            checks: []
          }
        },
        `Schema.Tuple([Schema.optionalKey(Schema.String)])`
      )

      assertFromJsonSchema(
        {
          schema: {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            maxItems: 1
          }
        },
        {
          representation: {
            _tag: "Arrays",
            elements: [
              { isOptional: false, type: { _tag: "String", checks: [] } }
            ],
            rest: [],
            checks: []
          }
        },
        `Schema.Tuple([Schema.String])`
      )
    })

    it("prefixItems & minItems", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            items: { type: "number" }
          }
        },
        {
          representation: {
            _tag: "Arrays",
            elements: [
              { isOptional: false, type: { _tag: "String", checks: [] } }
            ],
            rest: [
              {
                _tag: "Number",
                checks: [{ _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }]
              }
            ],
            checks: []
          }
        },
        `Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number.check(Schema.isFinite())])`
      )
    })

    describe("checks", () => {
      it("minItems", () => {
        assertFromJsonSchema(
          { schema: { type: "array", minItems: 1 } },
          {
            representation: {
              _tag: "Arrays",
              elements: [],
              rest: [json()],
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } }
              }]
            }
          },
          `Schema.Array(Schema.Json).check(Schema.isMinLength(1))`
        )
      })

      it("maxItems", () => {
        assertFromJsonSchema(
          { schema: { type: "array", maxItems: 1 } },
          {
            representation: {
              _tag: "Arrays",
              elements: [],
              rest: [json()],
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 1 } }
              }]
            }
          },
          `Schema.Array(Schema.Json).check(Schema.isMaxLength(1))`
        )
      })

      it("uniqueItems", () => {
        assertFromJsonSchema(
          { schema: { type: "array", uniqueItems: true } },
          {
            representation: {
              _tag: "Arrays",
              elements: [],
              rest: [json()],
              checks: [{ _tag: "Filter", representation: { id: "effect/schema/isUnique", payload: null } }]
            }
          },
          `Schema.Array(Schema.Json).check(Schema.isUnique())`
        )
      })
    })
  })

  describe("type: object", () => {
    it("type only", () => {
      assertFromJsonSchema(
        { schema: { type: "object" } },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [],
            indexSignatures: [
              { parameter: { _tag: "String", checks: [] }, type: json() }
            ],
            checks: []
          }
        },
        `Schema.Record(Schema.String, Schema.Json)`
      )
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            additionalProperties: false
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [],
            indexSignatures: [],
            checks: []
          }
        },
        `Schema.Struct({  })`
      )
    })

    it("additionalProperties", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            additionalProperties: { type: "boolean" }
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [],
            indexSignatures: [
              { parameter: { _tag: "String", checks: [] }, type: { _tag: "Boolean" } }
            ],
            checks: []
          }
        },
        `Schema.Record(Schema.String, Schema.Boolean)`
      )
    })

    it("properties", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            properties: { a: { type: "string" }, b: { type: "string" } },
            required: ["a"],
            additionalProperties: false
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [
              {
                name: "a",
                type: { _tag: "String", checks: [] },
                isOptional: false,
                isMutable: false
              },
              {
                name: "b",
                type: { _tag: "String", checks: [] },
                isOptional: true,
                isMutable: false
              }
            ],
            indexSignatures: [],
            checks: []
          }
        },
        `Schema.Struct({ "a": Schema.String, "b": Schema.optionalKey(Schema.String) })`
      )
    })

    it("properties & additionalProperties", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            properties: { a: { type: "string" } },
            required: ["a"],
            additionalProperties: { type: "boolean" }
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [{
              name: "a",
              type: { _tag: "String", checks: [] },
              isOptional: false,
              isMutable: false
            }],
            indexSignatures: [
              { parameter: { _tag: "String", checks: [] }, type: { _tag: "Boolean" } }
            ],
            checks: []
          }
        },
        `Schema.StructWithRest(Schema.Struct({ "a": Schema.String }), [Schema.Record(Schema.String, Schema.Boolean)])`
      )
    })

    it("patternProperties", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            patternProperties: {
              "a*": { type: "string" }
            },
            additionalProperties: false
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [],
            indexSignatures: [
              {
                parameter: {
                  _tag: "String",
                  checks: [{
                    _tag: "Filter",
                    representation: { id: "effect/schema/isPattern", payload: { source: "a*", flags: "" } }
                  }]
                },
                type: { _tag: "String", checks: [] }
              }
            ],
            checks: []
          }
        },
        `Schema.Record(Schema.String.check(Schema.isPattern(new RegExp("a*"))), Schema.String)`
      )
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            patternProperties: {
              "a*": { type: "string" },
              "b*": { type: "number" }
            },
            additionalProperties: false
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [],
            indexSignatures: [
              {
                parameter: {
                  _tag: "String",
                  checks: [{
                    _tag: "Filter",
                    representation: { id: "effect/schema/isPattern", payload: { source: "a*", flags: "" } }
                  }]
                },
                type: { _tag: "String", checks: [] }
              },
              {
                parameter: {
                  _tag: "String",
                  checks: [{
                    _tag: "Filter",
                    representation: { id: "effect/schema/isPattern", payload: { source: "b*", flags: "" } }
                  }]
                },
                type: {
                  _tag: "Number",
                  checks: [{ _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }]
                }
              }
            ],
            checks: []
          }
        },
        `Schema.StructWithRest(Schema.Struct({  }), [Schema.Record(Schema.String.check(Schema.isPattern(new RegExp("a*"))), Schema.String), Schema.Record(Schema.String.check(Schema.isPattern(new RegExp("b*"))), Schema.Number.check(Schema.isFinite()))])`
      )
    })

    describe("checks", () => {
      it("minProperties", () => {
        assertFromJsonSchema(
          { schema: { type: "object", minProperties: 1 } },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [],
              indexSignatures: [
                { parameter: { _tag: "String", checks: [] }, type: json() }
              ],
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMinProperties", payload: { minProperties: 1 } }
              }]
            }
          },
          `Schema.Record(Schema.String, Schema.Json).check(Schema.isMinProperties(1))`
        )
      })

      it("maxProperties", () => {
        assertFromJsonSchema(
          { schema: { type: "object", maxProperties: 1 } },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [],
              indexSignatures: [
                { parameter: { _tag: "String", checks: [] }, type: json() }
              ],
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMaxProperties", payload: { maxProperties: 1 } }
              }]
            }
          },
          `Schema.Record(Schema.String, Schema.Json).check(Schema.isMaxProperties(1))`
        )
      })
    })

    describe("propertyNames", () => {
      it("pattern", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "object",
              propertyNames: { pattern: "^[A-Z]" }
            }
          },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [],
              indexSignatures: [
                {
                  parameter: { _tag: "String", checks: [] },
                  type: json()
                }
              ],
              checks: [{
                _tag: "Filter",
                representation: {
                  id: "effect/schema/isPropertyNames",
                  payload: null,
                  schemas: [{
                    _tag: "String",
                    checks: [{
                      _tag: "Filter",
                      representation: { id: "effect/schema/isPattern", payload: { source: "^[A-Z]", flags: "" } }
                    }]
                  }]
                }
              }]
            }
          },
          `Schema.Record(Schema.String, Schema.Json).check(Schema.isPropertyNames(Schema.String.check(Schema.isPattern(new RegExp("^[A-Z]")))))`
        )
      })

      it("false", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "object",
              propertyNames: false
            }
          },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [],
              indexSignatures: [
                { parameter: { _tag: "String", checks: [] }, type: json() }
              ],
              checks: [
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isPropertyNames", payload: null, schemas: [{ _tag: "Never" }] }
                }
              ]
            }
          },
          `Schema.Record(Schema.String, Schema.Json).check(Schema.isPropertyNames(Schema.Never))`
        )
      })

      it("allOf combines checks", () => {
        assertFromJsonSchema(
          {
            schema: {
              allOf: [
                { type: "object", propertyNames: { pattern: "^[A-Z]" } },
                { type: "object", propertyNames: { minLength: 2 } }
              ]
            }
          },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [],
              indexSignatures: [
                { parameter: { _tag: "String", checks: [] }, type: json() }
              ],
              checks: [
                {
                  _tag: "Filter",
                  representation: {
                    id: "effect/schema/isPropertyNames",
                    payload: null,
                    schemas: [{
                      _tag: "String",
                      checks: [{
                        _tag: "Filter",
                        representation: { id: "effect/schema/isPattern", payload: { source: "^[A-Z]", flags: "" } }
                      }]
                    }]
                  }
                },
                {
                  _tag: "Filter",
                  representation: {
                    id: "effect/schema/isPropertyNames",
                    payload: null,
                    schemas: [{
                      _tag: "String",
                      checks: [{
                        _tag: "Filter",
                        representation: { id: "effect/schema/isMinLength", payload: { minLength: 2 } }
                      }]
                    }]
                  }
                }
              ]
            }
          },
          `Schema.Record(Schema.String, Schema.Json).check(Schema.isPropertyNames(Schema.String.check(Schema.isPattern(new RegExp("^[A-Z]"))))).check(Schema.isPropertyNames(Schema.String.check(Schema.isMinLength(2))))`
        )
      })
    })
  })

  it("type: array of strings", () => {
    assertFromJsonSchema(
      {
        schema: { type: ["string", "null"] }
      },
      {
        representation: {
          _tag: "Union",
          types: [{ _tag: "String", checks: [] }, { _tag: "Null" }],
          mode: "anyOf"
        }
      },
      `Schema.Union([Schema.String, Schema.Null])`
    )
    assertFromJsonSchema(
      {
        schema: {
          type: ["string", "null"],
          description: "a"
        }
      },
      {
        representation: {
          _tag: "Union",
          types: [{ _tag: "String", checks: [] }, { _tag: "Null" }],
          mode: "anyOf",
          annotations: { description: "a" }
        }
      },
      `Schema.Union([Schema.String, Schema.Null]).annotate({ "description": "a" })`
    )
  })

  it("imports true schemas and structured enum members", () => {
    assertFromJsonSchema(
      { schema: { allOf: [true, { type: "string" }] } },
      { representation: { _tag: "String", checks: [] } },
      `Schema.String`
    )
    assertFromJsonSchema(
      { schema: { enum: [[], {}] } },
      {
        representation: {
          _tag: "Union",
          types: [json(), json()],
          mode: "anyOf",
          checks: []
        }
      }
    )
  })

  it("imports format and contentEncoding annotations", () => {
    assertFromJsonSchema(
      {
        schema: {
          type: "string",
          format: "email",
          contentEncoding: "base64"
        }
      },
      {
        representation: {
          _tag: "String",
          checks: [],
          annotations: { format: "email", contentEncoding: "base64" }
        }
      },
      `Schema.String.annotate({ "format": "email", "contentEncoding": "base64" })`
    )
  })

  describe("$ref", () => {
    it("treats a reference with an empty token as unconstrained", () => {
      assertFromJsonSchema(
        { schema: { $ref: "" } },
        { representation: json() },
        `Schema.Json`
      )
    })

    it("should create a Reference and a definition", () => {
      assertFromJsonSchema(
        {
          schema: {
            $ref: "#/$defs/A",
            $defs: {
              A: {
                type: "string"
              }
            }
          }
        },
        {
          representation: { _tag: "Reference", $ref: "A" },
          references: {
            A: {
              _tag: "String",
              checks: []
            }
          }
        }
      )
    })

    it("should preserve an annotated $ref as a stable suspend", () => {
      assertFromJsonSchema(
        {
          schema: {
            $ref: "#/$defs/A",
            description: "a",
            $defs: {
              A: {
                type: "string"
              }
            }
          }
        },
        {
          representation: {
            _tag: "Suspend",
            checks: [],
            annotations: { description: "a" },
            thunk: { _tag: "Reference", $ref: "A" }
          },
          references: {
            A: {
              _tag: "String",
              checks: []
            }
          }
        }
      )
    })

    it("should preserve a $ref refined only by annotations as a stable suspend", () => {
      assertFromJsonSchema(
        {
          schema: {
            allOf: [
              { $ref: "#/$defs/A" },
              { description: "a" }
            ],
            $defs: {
              A: {
                type: "string"
              }
            }
          }
        },
        {
          representation: {
            _tag: "Suspend",
            checks: [],
            annotations: { description: "a" },
            thunk: { _tag: "Reference", $ref: "A" }
          },
          references: {
            A: {
              _tag: "String",
              checks: []
            }
          }
        }
      )
    })

    it("recursive schema", () => {
      assertFromJsonSchema(
        {
          schema: {
            $ref: "#/$defs/A",
            $defs: {
              A: {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "children": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/A"
                    }
                  }
                },
                "required": [
                  "name",
                  "children"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        {
          representation: { _tag: "Reference", $ref: "A" },
          references: {
            A: {
              _tag: "Objects",
              propertySignatures: [
                {
                  name: "name",
                  type: { _tag: "String", checks: [] },
                  isOptional: false,
                  isMutable: false
                },
                {
                  name: "children",
                  type: {
                    _tag: "Arrays",
                    elements: [],
                    rest: [{
                      _tag: "Reference",
                      $ref: "A"
                    }],
                    checks: []
                  },
                  isOptional: false,
                  isMutable: false
                }
              ],
              indexSignatures: [],
              checks: []
            }
          }
        }
      )
    })
  })

  describe("allOf", () => {
    it("resolves references on either side of an intersection", () => {
      const definition: JsonSchema.JsonSchema = { type: "string", minLength: 1 }
      const expected = {
        representation: {
          _tag: "String" as const,
          checks: [
            { _tag: "Filter" as const, representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } },
            { _tag: "Filter" as const, representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } } }
          ]
        },
        references: {
          A: {
            _tag: "String" as const,
            checks: [{
              _tag: "Filter" as const,
              representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } }
            }]
          }
        }
      }
      for (
        const schema of [
          {
            $ref: "#/$defs/A",
            allOf: [{ type: "string", maxLength: 2 }],
            $defs: { A: definition }
          },
          {
            allOf: [{ $ref: "#/$defs/A" }, { type: "string", maxLength: 2 }],
            $defs: { A: definition }
          }
        ]
      ) {
        assertFromJsonSchema({ schema }, expected)
      }
    })

    it("preserves annotations on array and object intersections", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "array",
            allOf: [{ description: "a" }]
          }
        },
        {
          representation: {
            _tag: "Arrays",
            elements: [],
            rest: [json()],
            checks: [],
            annotations: { description: "a" }
          }
        },
        `Schema.Array(Schema.Json).annotate({ "description": "a" })`
      )
      assertFromJsonSchema(
        {
          schema: {
            type: "object",
            additionalProperties: false,
            allOf: [{ description: "a" }]
          }
        },
        {
          representation: {
            _tag: "Objects",
            propertySignatures: [],
            indexSignatures: [],
            checks: [],
            annotations: { description: "a" }
          }
        },
        `Schema.Struct({  }).annotate({ "description": "a" })`
      )
    })

    it("returns Never when a union has no compatible member", () => {
      assertFromJsonSchema(
        {
          schema: {
            type: "string",
            allOf: [{ anyOf: [{ type: "number" }, { type: "boolean" }] }]
          }
        },
        { representation: { _tag: "Never" } },
        `Schema.Never`
      )
    })

    function assertLiteralRefinement(
      refinement: JsonSchema.JsonSchema,
      valid: string | number,
      invalid: string | number
    ) {
      for (const literal of [valid, invalid]) {
        for (const allOf of [[refinement, { const: literal }], [{ const: literal }, refinement]]) {
          const schema = toSchemaFromJsonSchemaDocument(
            JsonSchema.fromSchemaDraft2020_12({ allOf })
          )
          const is = Schema.is(schema)
          if (literal === valid) {
            assertTrue(is(literal))
          } else {
            assertFalse(is(literal))
          }
        }
      }
    }

    describe("literal refinements", () => {
      const cases: ReadonlyArray<
        readonly [
          name: string,
          refinement: JsonSchema.JsonSchema,
          valid: string | number,
          invalid: string | number
        ]
      > = [
        ["minLength", { type: "string", minLength: 2 }, "ab", "a"],
        ["maxLength", { type: "string", maxLength: 1 }, "a", "ab"],
        ["pattern", { type: "string", pattern: "^a+$" }, "aa", "ab"],
        ["integer", { type: "integer" }, 1, 1.5],
        ["multipleOf", { type: "number", multipleOf: 0.1 }, 0.3, 0.31],
        [
          "multipleOf beyond the toFixed precision limit",
          { type: "number", multipleOf: Number("1e-101") },
          0,
          Number("5e-102")
        ],
        ["multipleOf with a large scientific operand", { type: "number", multipleOf: 2 }, Number("1e21"), 1],
        [
          "multipleOf with a nonzero subnormal remainder",
          { type: "number", multipleOf: Number("1e-323") },
          0,
          Number("1.042e-321")
        ],
        ["minimum", { type: "number", minimum: 1 }, 1, 0],
        ["maximum", { type: "number", maximum: 1 }, 1, 2],
        ["exclusiveMinimum", { type: "number", exclusiveMinimum: 1 }, 2, 1],
        ["exclusiveMaximum", { type: "number", exclusiveMaximum: 1 }, 0, 1],
        [
          "filter group",
          { type: "number", allOf: [{ minimum: 1, maximum: 2, description: "range" }] },
          2,
          0
        ]
      ]

      for (const [name, refinement, valid, invalid] of cases) {
        it(name, () => {
          assertLiteralRefinement(refinement, valid, invalid)
        })
      }

      it("filters enum members", () => {
        const expected = {
          representation: {
            _tag: "Union" as const,
            types: [{ _tag: "Literal" as const, literal: "ab" }],
            mode: "anyOf" as const
          }
        }
        for (
          const [schema, member] of [
            [{ type: "string", minLength: 2 }, { enum: ["a", "ab"] }],
            [{ enum: ["a", "ab"] }, { type: "string", minLength: 2 }]
          ]
        ) {
          assertFromJsonSchema(
            { schema: { ...schema, allOf: [member] } },
            expected,
            `Schema.Literal("ab")`
          )
        }
      })
    })

    it("no type", () => {
      assertFromJsonSchema(
        {
          schema: {
            allOf: [
              { type: "string" }
            ]
          }
        },
        {
          representation: {
            _tag: "String",
            checks: []
          }
        },
        `Schema.String`
      )
    })

    describe("type: string", () => {
      it("& minLength", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { minLength: 1 }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } }
              ]
            }
          },
          `Schema.String.check(Schema.isMinLength(1))`
        )
      })

      it("& minLength + description", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { minLength: 1, description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } },
                  annotations: { description: "b" }
                }
              ]
            }
          },
          `Schema.String.check(Schema.isMinLength(1).annotate({ "description": "b" }))`
        )
      })

      it("description & minLength", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              description: "a",
              allOf: [
                { minLength: 1 }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } }
              ],
              annotations: { description: "a" }
            }
          },
          `Schema.String.annotate({ "description": "a" }).check(Schema.isMinLength(1))`
        )
      })

      it("description & description", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              description: "a",
              allOf: [
                { description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [],
              annotations: { description: "b" }
            }
          },
          `Schema.String.annotate({ "description": "b" })`
        )
      })

      it("description & minLength + description", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              description: "a",
              allOf: [
                { minLength: 1, description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } },
                  annotations: { description: "b" }
                }
              ],
              annotations: { description: "a" }
            }
          },
          `Schema.String.annotate({ "description": "a" }).check(Schema.isMinLength(1).annotate({ "description": "b" }))`
        )
      })

      it("maxLength & minLength", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              maxLength: 2,
              allOf: [
                { minLength: 1 }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } } },
                { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } }
              ]
            }
          },
          `Schema.String.check(Schema.isMaxLength(2)).check(Schema.isMinLength(1))`
        )
      })

      it("description + maxLength & minLength", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              description: "a",
              maxLength: 2,
              allOf: [
                { minLength: 1 }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } } },
                { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } }
              ],
              annotations: { description: "a" }
            }
          },
          `Schema.String.annotate({ "description": "a" }).check(Schema.isMaxLength(2)).check(Schema.isMinLength(1))`
        )
      })

      it("description + maxLength & minLength + description", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              description: "a",
              maxLength: 2,
              allOf: [
                { minLength: 1, description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } },
                  annotations: { description: "b" }
                }
              ],
              annotations: { description: "a" }
            }
          },
          `Schema.String.annotate({ "description": "a" }).check(Schema.isMaxLength(2)).check(Schema.isMinLength(1).annotate({ "description": "b" }))`
        )
      })

      it("& minLength + maxLength", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { minLength: 1, maxLength: 2 }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } },
                { _tag: "Filter", representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } } }
              ]
            }
          },
          `Schema.String.check(Schema.isMinLength(1)).check(Schema.isMaxLength(2))`
        )
      })

      it("& minLength + maxLength + description", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { minLength: 1, maxLength: 2, description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                {
                  _tag: "FilterGroup",
                  checks: [
                    { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } },
                    { _tag: "Filter", representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } } }
                  ],
                  annotations: { description: "b" }
                }
              ]
            }
          },
          `Schema.String.check(Schema.makeFilterGroup([Schema.isMinLength(1), Schema.isMaxLength(2)]).annotate({ "description": "b" }))`
        )
      })

      it("& (minLength & maxLength + description)", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { minLength: 1, allOf: [{ maxLength: 2, description: "c" }] }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } },
                  annotations: { description: "c" }
                }
              ]
            }
          },
          `Schema.String.check(Schema.isMinLength(1)).check(Schema.isMaxLength(2).annotate({ "description": "c" }))`
        )
      })

      it("& (minLength + description & maxLength + description)", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { minLength: 1, description: "b", allOf: [{ maxLength: 2, description: "c" }] }
              ]
            }
          },
          {
            representation: {
              _tag: "String",
              checks: [
                {
                  _tag: "FilterGroup",
                  checks: [
                    { _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } },
                    {
                      _tag: "Filter",
                      representation: { id: "effect/schema/isMaxLength", payload: { maxLength: 2 } },
                      annotations: { description: "c" }
                    }
                  ],
                  annotations: { description: "b" }
                }
              ]
            }
          },
          `Schema.String.check(Schema.makeFilterGroup([Schema.isMinLength(1), Schema.isMaxLength(2).annotate({ "description": "c" })]).annotate({ "description": "b" }))`
        )
      })

      it("& string enum", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { enum: ["a"] }
              ]
            }
          },
          {
            representation: {
              _tag: "Literal",
              literal: "a"
            }
          },
          `Schema.Literal("a")`
        )
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              description: "a",
              allOf: [
                { enum: ["a"], description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "Literal",
              literal: "a",
              annotations: { description: "b" }
            }
          },
          `Schema.Literal("a").annotate({ "description": "b" })`
        )
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { enum: ["a", "b"] }
              ]
            }
          },
          {
            representation: {
              _tag: "Union",
              types: [
                { _tag: "Literal", literal: "a" },
                { _tag: "Literal", literal: "b" }
              ],
              mode: "anyOf"
            }
          },
          `Schema.Literals(["a", "b"])`
        )
      })

      it("& mixed enum", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "string",
              allOf: [
                { enum: ["a", 1] }
              ]
            }
          },
          {
            representation: {
              _tag: "Union",
              types: [
                { _tag: "Literal", literal: "a" }
              ],
              mode: "anyOf"
            }
          },
          `Schema.Literal("a")`
        )
      })
    })

    describe("type: number", () => {
      it("number & number preserves annotations after removing duplicate checks", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [{ type: "number", description: "b" }]
            }
          },
          {
            representation: {
              _tag: "Number",
              checks: [{ _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }],
              annotations: { description: "b" }
            }
          },
          `Schema.Number.annotate({ "description": "b" }).check(Schema.isFinite())`
        )
      })

      it("number & integer", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [
                { type: "integer" }
              ]
            }
          },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isInt())`
        )
      })

      it("number & integer & integer", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [
                { type: "integer", minimum: 2 },
                { type: "integer", maximum: 2 }
              ]
            }
          },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                {
                  _tag: "Filter",
                  representation: { id: "effect/schema/isGreaterThanOrEqualTo", payload: { minimum: 2 } }
                },
                { _tag: "Filter", representation: { id: "effect/schema/isLessThanOrEqualTo", payload: { maximum: 2 } } }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.isInt()).check(Schema.isGreaterThanOrEqualTo(2)).check(Schema.isLessThanOrEqualTo(2))`
        )
      })

      it("integer & number", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "integer",
              allOf: [
                { type: "number" }
              ]
            }
          },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } },
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } }
              ]
            }
          },
          `Schema.Number.check(Schema.isInt()).check(Schema.isFinite())`
        )
      })

      it("& (minimum + description & maximum + description)", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [
                { minimum: 1, description: "b", allOf: [{ maximum: 2, description: "c" }] }
              ]
            }
          },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                {
                  _tag: "FilterGroup",
                  checks: [
                    {
                      _tag: "Filter",
                      representation: { id: "effect/schema/isGreaterThanOrEqualTo", payload: { minimum: 1 } }
                    },
                    {
                      _tag: "Filter",
                      representation: { id: "effect/schema/isLessThanOrEqualTo", payload: { maximum: 2 } },
                      annotations: { description: "c" }
                    }
                  ],
                  annotations: { description: "b" }
                }
              ]
            }
          },
          `Schema.Number.check(Schema.isFinite()).check(Schema.makeFilterGroup([Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(2).annotate({ "description": "c" })]).annotate({ "description": "b" }))`
        )
      })

      it("continues intersecting after an annotated filter group", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [
                { minimum: 1, maximum: 2, description: "range" },
                { type: "integer" }
              ]
            }
          },
          {
            representation: {
              _tag: "Number",
              checks: [
                { _tag: "Filter", representation: { id: "effect/schema/isFinite", payload: null } },
                {
                  _tag: "FilterGroup",
                  checks: [
                    {
                      _tag: "Filter",
                      representation: { id: "effect/schema/isGreaterThanOrEqualTo", payload: { minimum: 1 } }
                    },
                    {
                      _tag: "Filter",
                      representation: { id: "effect/schema/isLessThanOrEqualTo", payload: { maximum: 2 } }
                    }
                  ],
                  annotations: { description: "range" }
                },
                { _tag: "Filter", representation: { id: "effect/schema/isInt", payload: null } }
              ]
            }
          }
        )
      })

      it("& number enum", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [
                { enum: [1] }
              ]
            }
          },
          {
            representation: {
              _tag: "Literal",
              literal: 1
            }
          },
          `Schema.Literal(1)`
        )
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              description: "a",
              allOf: [
                { enum: [1], description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "Literal",
              literal: 1,
              annotations: { description: "b" }
            }
          },
          `Schema.Literal(1).annotate({ "description": "b" })`
        )
        assertFromJsonSchema(
          {
            schema: {
              type: "number",
              allOf: [
                { enum: [1, 2] }
              ]
            }
          },
          {
            representation: {
              _tag: "Union",
              types: [
                { _tag: "Literal", literal: 1 },
                { _tag: "Literal", literal: 2 }
              ],
              mode: "anyOf"
            }
          },
          `Schema.Literals([1, 2])`
        )
      })
    })

    describe("type: boolean", () => {
      it("boolean & boolean", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "boolean",
              allOf: [{ type: "boolean" }]
            }
          },
          { representation: { _tag: "Boolean", checks: [] } },
          `Schema.Boolean`
        )
      })

      it("boolean & non-boolean literal", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "boolean",
              allOf: [{ const: 1 }]
            }
          },
          { representation: { _tag: "Never" } },
          `Schema.Never`
        )
      })

      it("& boolean enum", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "boolean",
              allOf: [
                { enum: [true] }
              ]
            }
          },
          {
            representation: {
              _tag: "Literal",
              literal: true
            }
          },
          `Schema.Literal(true)`
        )
        assertFromJsonSchema(
          {
            schema: {
              type: "boolean",
              description: "a",
              allOf: [
                { enum: [true], description: "b" }
              ]
            }
          },
          {
            representation: {
              _tag: "Literal",
              literal: true,
              annotations: { description: "b" }
            }
          },
          `Schema.Literal(true).annotate({ "description": "b" })`
        )
      })
    })

    describe("type: array", () => {
      function assertArrayAllOf(
        a: JsonSchema.JsonSchema,
        b: JsonSchema.JsonSchema,
        expected: Parameters<typeof assertFromJsonSchema>[1],
        runtime: string,
        valid: ReadonlyArray<unknown>,
        invalid: ReadonlyArray<unknown>
      ) {
        for (const [schema, member] of [[a, b], [b, a]]) {
          const document = assertFromJsonSchema(
            { schema: { ...schema, allOf: [member] } },
            expected,
            runtime
          )
          const is = Schema.is(document)
          for (const value of valid) {
            assertTrue(is(value))
          }
          for (const value of invalid) {
            assertFalse(is(value))
          }
        }
      }

      it("uniqueItems & uniqueItems", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "array",
              uniqueItems: true,
              allOf: [
                { uniqueItems: true }
              ]
            }
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [],
              rest: [json()],
              checks: [{ _tag: "Filter", representation: { id: "effect/schema/isUnique", payload: null } }]
            }
          },
          `Schema.Array(Schema.Json).check(Schema.isUnique())`
        )
      })

      it("combines unequal open prefixes", () => {
        assertArrayAllOf(
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            items: { type: "string" }
          },
          {
            type: "array",
            prefixItems: [{ type: "string" }, { const: "tail" }],
            minItems: 2,
            items: { type: "string" }
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [
                { isOptional: false, type: { _tag: "String", checks: [] } },
                { isOptional: false, type: { _tag: "Literal", literal: "tail" } }
              ],
              rest: [{ _tag: "String", checks: [] }],
              checks: []
            }
          },
          `Schema.TupleWithRest(Schema.Tuple([Schema.String, Schema.Literal("tail")]), [Schema.String])`,
          [["head", "tail"], ["head", "tail", "more"]],
          [["head"], ["head", "other"], ["head", "tail", 1]]
        )
      })

      it("truncates optional elements forbidden by a closed tuple", () => {
        assertArrayAllOf(
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            maxItems: 1
          },
          {
            type: "array",
            prefixItems: [{ type: "string" }, { type: "number" }],
            minItems: 1,
            maxItems: 2
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [{ isOptional: false, type: { _tag: "String", checks: [] } }],
              rest: [],
              checks: []
            }
          },
          `Schema.Tuple([Schema.String])`,
          [["head"]],
          [[], ["head", 1]]
        )
      })

      it("returns Never when a closed tuple forbids a required element", () => {
        assertArrayAllOf(
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            maxItems: 1
          },
          {
            type: "array",
            prefixItems: [{ type: "string" }, { type: "number" }],
            minItems: 2,
            maxItems: 2
          },
          { representation: { _tag: "Never" } },
          `Schema.Never`,
          [],
          [[], ["head"], ["head", 1]]
        )
      })

      it("combines an open rest with a closed rest", () => {
        assertArrayAllOf(
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            items: { type: "number" }
          },
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            maxItems: 1
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [{ isOptional: false, type: { _tag: "String", checks: [] } }],
              rest: [],
              checks: []
            }
          },
          `Schema.Tuple([Schema.String])`,
          [["head"]],
          [[], ["head", 1]]
        )
      })

      it("closes the tuple when the rest intersection is Never", () => {
        assertArrayAllOf(
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            items: { type: "string" }
          },
          {
            type: "array",
            prefixItems: [{ type: "string" }],
            minItems: 1,
            items: { type: "number" }
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [{ isOptional: false, type: { _tag: "String", checks: [] } }],
              rest: [],
              checks: []
            }
          },
          `Schema.Tuple([Schema.String])`,
          [["head"]],
          [[], ["head", "tail"], ["head", 1]]
        )
      })

      it("rejects a required literal that fails rest refinements", () => {
        assertArrayAllOf(
          {
            type: "array",
            minItems: 1,
            items: { const: 0 }
          },
          {
            type: "array",
            prefixItems: [{ type: "number", minimum: 1 }],
            minItems: 1,
            maxItems: 1
          },
          { representation: { _tag: "Never" } },
          `Schema.Never`,
          [],
          [[], [0]]
        )
      })

      it("truncates an optional literal that fails rest refinements", () => {
        assertArrayAllOf(
          {
            type: "array",
            items: { const: 0 }
          },
          {
            type: "array",
            prefixItems: [{ type: "number", minimum: 1 }],
            maxItems: 1
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [],
              rest: [],
              checks: []
            }
          },
          `Schema.Tuple([])`,
          [[]],
          [[0]]
        )
      })

      it("preserves a literal that satisfies rest refinements", () => {
        assertArrayAllOf(
          {
            type: "array",
            minItems: 1,
            items: { const: 2 }
          },
          {
            type: "array",
            prefixItems: [{ type: "number", minimum: 1 }],
            minItems: 1,
            maxItems: 1
          },
          {
            representation: {
              _tag: "Arrays",
              elements: [{ isOptional: false, type: { _tag: "Literal", literal: 2 } }],
              rest: [],
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } }
              }]
            }
          },
          `Schema.Tuple([Schema.Literal(2)]).check(Schema.isMinLength(1))`,
          [[2]],
          [[], [0]]
        )
      })
    })

    it("short-circuits Never and handles primitive intersections", () => {
      for (
        const schema of [
          { allOf: [false, { type: "string" }] },
          { allOf: [{ type: "array" }, { type: "string" }] },
          { allOf: [{ type: "object" }, { type: "string" }] },
          { allOf: [{ type: "null" }, { type: "string" }] },
          { allOf: [{ const: 1 }, { const: 2 }] }
        ]
      ) {
        assertFromJsonSchema({ schema }, { representation: { _tag: "Never" } }, `Schema.Never`)
      }

      assertFromJsonSchema(
        { schema: { allOf: [{ type: "null" }, { type: "null" }] } },
        { representation: { _tag: "Null" } },
        `Schema.Null`
      )
      assertFromJsonSchema(
        { schema: { allOf: [{ const: 1 }, { const: 1 }] } },
        { representation: { _tag: "Literal", literal: 1 } },
        `Schema.Literal(1)`
      )
      for (
        const allOf of [
          [{ type: "boolean" }, { const: true }],
          [{ const: true }, { type: "boolean" }]
        ]
      ) {
        assertFromJsonSchema(
          { schema: { allOf } },
          { representation: { _tag: "Literal", literal: true } },
          `Schema.Literal(true)`
        )
      }
    })

    it("combines references and annotated stable wrappers on either side", () => {
      const definition: JsonSchema.JsonSchema = { type: "string", minLength: 1 }
      assertFromJsonSchema(
        {
          schema: {
            type: "string",
            allOf: [{ $ref: "#/$defs/A" }],
            $defs: { A: definition }
          }
        },
        {
          representation: {
            _tag: "String",
            checks: [{ _tag: "Filter", representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } } }]
          },
          references: {
            A: {
              _tag: "String",
              checks: [{
                _tag: "Filter",
                representation: { id: "effect/schema/isMinLength", payload: { minLength: 1 } }
              }]
            }
          }
        }
      )

      for (
        const schema of [
          {
            type: "string",
            allOf: [{ $ref: "#/$defs/A", description: "annotated" }],
            $defs: { A: definition }
          },
          {
            $ref: "#/$defs/A",
            description: "annotated",
            allOf: [{ type: "string" }],
            $defs: { A: definition }
          }
        ]
      ) {
        const document = fromJsonSchemaRepresentation(JsonSchema.fromSchemaDraft2020_12(schema))
        strictEqual(document.representation._tag, "String")
        if (document.representation._tag === "String") {
          strictEqual(document.representation.annotations?.description, "annotated")
        }
      }

      const aliases = fromJsonSchemaRepresentation(
        JsonSchema.fromSchemaDraft2020_12({
          type: "string",
          allOf: [{ $ref: "#/$defs/A" }],
          $defs: {
            A: { $ref: "#/$defs/B", description: "alias" },
            B: { type: "string" }
          }
        })
      )
      strictEqual(aliases.representation._tag, "String")
      if (aliases.representation._tag === "String") {
        strictEqual(aliases.representation.annotations?.description, "alias")
      }
    })

    it("merges string content, overlapping properties and index signatures", () => {
      const string = fromJsonSchemaRepresentation(
        JsonSchema.fromSchemaDraft2020_12({
          allOf: [
            { type: "string", contentMediaType: "text/plain" },
            { type: "string", contentSchema: { type: "number" } }
          ]
        })
      )
      strictEqual(string.representation._tag, "String")
      if (string.representation._tag === "String") {
        strictEqual(string.representation.contentMediaType, "text/plain")
        strictEqual(string.representation.contentSchema?._tag, "Number")
      }

      const leftContentSchema = fromJsonSchemaRepresentation(
        JsonSchema.fromSchemaDraft2020_12({
          type: "string",
          contentSchema: { type: "number" },
          allOf: [{ type: "string" }]
        })
      )
      strictEqual(leftContentSchema.representation._tag, "String")
      if (leftContentSchema.representation._tag === "String") {
        strictEqual(leftContentSchema.representation.contentSchema?._tag, "Number")
      }

      const object = toSchemaFromJsonSchemaDocument(
        JsonSchema.fromSchemaDraft2020_12({
          type: "object",
          additionalProperties: false,
          properties: { a: { type: "string" } },
          required: ["a"],
          allOf: [{
            type: "object",
            additionalProperties: false,
            properties: { a: { type: "string", minLength: 2 } },
            required: ["a"]
          }]
        })
      )
      const isObject = Schema.is(object)
      assertTrue(isObject({ a: "ab" }))
      assertFalse(isObject({ a: "a" }))

      const optionalObject = fromJsonSchemaRepresentation(
        JsonSchema.fromSchemaDraft2020_12({
          type: "object",
          additionalProperties: false,
          properties: { a: { type: "string" } },
          allOf: [{
            type: "object",
            additionalProperties: false,
            properties: { a: { minLength: 1 } }
          }]
        })
      )
      strictEqual(optionalObject.representation._tag, "Objects")
      if (optionalObject.representation._tag === "Objects") {
        strictEqual(optionalObject.representation.propertySignatures[0].isOptional, true)
      }

      const indexes = fromJsonSchemaRepresentation(
        JsonSchema.fromSchemaDraft2020_12({
          type: "object",
          additionalProperties: false,
          patternProperties: { "^a": { type: "string" } },
          allOf: [
            { type: "object", additionalProperties: true },
            {
              type: "object",
              additionalProperties: false,
              patternProperties: { "^b": { type: "number" } }
            }
          ]
        })
      )
      strictEqual(indexes.representation._tag, "Objects")
      if (indexes.representation._tag === "Objects") {
        strictEqual(indexes.representation.indexSignatures.length, 3)
      }
    })

    describe("type: object", () => {
      it("add properties", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "object",
              additionalProperties: false,
              allOf: [
                { properties: { a: { type: "string" } } }
              ]
            }
          },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [
                {
                  name: "a",
                  type: { _tag: "String", checks: [] },
                  isOptional: true,
                  isMutable: false
                }
              ],
              indexSignatures: [],
              checks: []
            }
          },
          `Schema.Struct({ "a": Schema.optionalKey(Schema.String) })`
        )
      })

      it("add additionalProperties", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "object",
              allOf: [
                { additionalProperties: { type: "boolean" } }
              ]
            }
          },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [],
              indexSignatures: [
                { parameter: { _tag: "String", checks: [] }, type: { _tag: "Boolean" } }
              ],
              checks: []
            }
          },
          `Schema.Record(Schema.String, Schema.Boolean)`
        )
      })
    })
  })

  describe("options", () => {
    describe("onEnter", () => {
      it("additionalProperties false via onEnter", () => {
        assertFromJsonSchema(
          {
            schema: {
              type: "object",
              properties: {
                a: { type: "string" }
              },
              required: ["a"]
            },
            options: {
              onEnter: (js) => {
                if (js.type === "object" && js.additionalProperties === undefined) {
                  return { ...js, additionalProperties: false }
                }
                return js
              }
            }
          },
          {
            representation: {
              _tag: "Objects",
              propertySignatures: [
                {
                  name: "a",
                  type: { _tag: "String", checks: [] },
                  isOptional: false,
                  isMutable: false
                }
              ],
              indexSignatures: [],
              checks: []
            }
          },
          `Schema.Struct({ "a": Schema.String })`
        )
      })

      it("strips annotation keys via onEnter", () => {
        assertFromJsonSchema(
          {
            schema: {
              title: "a",
              description: "b",
              examples: ["d"]
            },
            options: {
              onEnter: (js) => {
                const out = { ...js }
                delete out.examples
                return out
              }
            }
          },
          {
            representation: json({
              title: "a",
              description: "b"
            })
          },
          `Schema.Json.annotate({ "title": "a", "description": "b" })`
        )
      })

      it("filters annotations by predicate via onEnter", () => {
        assertFromJsonSchema(
          {
            schema: {
              title: "a",
              description: "b",
              examples: ["d"],
              default: "c"
            },
            options: {
              onEnter: (js) => {
                const out: any = {}
                for (const [k, v] of Object.entries(js)) {
                  if (k === "title" || k === "default" || k === "type") out[k] = v
                }
                return out
              }
            }
          },
          {
            representation: json({
              title: "a",
              default: "c"
            })
          },
          `Schema.Json.annotate({ "title": "a", "default": "c" })`
        )
      })

      it("default preserves all annotations", () => {
        assertFromJsonSchema(
          {
            schema: {
              title: "a",
              description: "b",
              default: "c",
              examples: ["d"]
            }
          },
          {
            representation: json({
              title: "a",
              description: "b",
              default: "c",
              examples: ["d"]
            })
          },
          `Schema.Json.annotate({ "title": "a", "description": "b", "default": "c", "examples": ["d"] })`
        )
      })
    })
  })
})
