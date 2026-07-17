import { assert, describe, it } from "@effect/vitest"
import { SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

describe("SchemaRepresentation.fromJson", () => {
  it("decodes a document", () => {
    const input = {
      representation: {
        _tag: "String",
        annotations: { description: "value" },
        checks: []
      },
      references: {}
    } as const

    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Null", () => {
    const input = { representation: { _tag: "Null", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Undefined", () => {
    const input = { representation: { _tag: "Undefined", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Void", () => {
    const input = { representation: { _tag: "Void", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Never", () => {
    const input = { representation: { _tag: "Never", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Unknown", () => {
    const input = { representation: { _tag: "Unknown", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Any", () => {
    const input = { representation: { _tag: "Any", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Number", () => {
    const input = { representation: { _tag: "Number", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Boolean", () => {
    const input = { representation: { _tag: "Boolean", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes BigInt", () => {
    const input = { representation: { _tag: "BigInt", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Symbol", () => {
    const input = { representation: { _tag: "Symbol", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes ObjectKeyword", () => {
    const input = { representation: { _tag: "ObjectKeyword", checks: [] }, references: {} } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Enum", () => {
    const input = {
      representation: { _tag: "Enum", enums: [["A", "a"], ["One", 1]], checks: [] },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes TemplateLiteral", () => {
    const input = {
      representation: {
        _tag: "TemplateLiteral",
        parts: [
          { _tag: "Literal", literal: "prefix-", checks: [] },
          { _tag: "String", checks: [] }
        ],
        checks: []
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Arrays", () => {
    const input = {
      representation: {
        _tag: "Arrays",
        elements: [{ type: { _tag: "String", checks: [] }, isOptional: false }],
        rest: [{ _tag: "Number", checks: [] }],
        checks: []
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Objects", () => {
    const input = {
      representation: {
        _tag: "Objects",
        propertySignatures: [{
          name: "value",
          type: { _tag: "String", checks: [] },
          isOptional: false,
          isMutable: true
        }],
        indexSignatures: [{
          parameter: { _tag: "String", checks: [] },
          type: { _tag: "Number", checks: [] }
        }],
        checks: []
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Union", () => {
    const input = {
      representation: {
        _tag: "Union",
        types: [{ _tag: "String", checks: [] }, { _tag: "Number", checks: [] }],
        mode: "oneOf",
        checks: []
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Reference", () => {
    const input = {
      representation: { _tag: "Reference", $ref: "Value" },
      references: { Value: { _tag: "String", checks: [] } }
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Suspend", () => {
    const input = {
      representation: {
        _tag: "Suspend",
        thunk: { _tag: "Reference", $ref: "Value" },
        checks: []
      },
      references: { Value: { _tag: "String", checks: [] } }
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Declaration", () => {
    const input = {
      representation: {
        _tag: "Declaration",
        representation: { id: "acme/schema/Value", payload: null },
        annotations: {},
        typeParameters: [{ _tag: "String", checks: [] }],
        checks: []
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes Filter", () => {
    const input = {
      representation: {
        _tag: "String",
        checks: [{
          _tag: "Filter",
          representation: { id: "acme/schema/filter", payload: null },
          annotations: {},
          aborted: true
        }]
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes FilterGroup", () => {
    const input = {
      representation: {
        _tag: "String",
        checks: [{
          _tag: "FilterGroup",
          checks: [{
            _tag: "Filter",
            representation: { id: "acme/schema/filter", payload: null },
            annotations: {},
            aborted: false
          }]
        }]
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes String content schemas", () => {
    const input = {
      representation: {
        _tag: "String",
        contentMediaType: "application/json",
        contentSchema: { _tag: "Number", checks: [] },
        checks: []
      },
      references: {}
    } as const
    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("decodes bigint structural values", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.fromJson({
        representation: {
          _tag: "Literal",
          literal: "1",
          checks: []
        },
        references: {}
      }),
      {
        representation: { _tag: "Literal", literal: 1n, checks: [] },
        references: {}
      }
    )
  })

  it("decodes negative zero structural values", () => {
    const document = SchemaRepresentation.fromJson({
      representation: {
        _tag: "Literal",
        literal: -0,
        checks: []
      },
      references: {}
    })

    assert.strictEqual(document.representation._tag, "Literal")
    if (document.representation._tag !== "Literal") return
    assert.isTrue(Object.is(document.representation.literal, -0))
  })

  it("decodes NaN structural values", () => {
    const document = SchemaRepresentation.fromJson({
      representation: {
        _tag: "Literal",
        literal: "NaN",
        checks: []
      },
      references: {}
    })

    assert.strictEqual(document.representation._tag, "Literal")
    if (document.representation._tag !== "Literal") return
    assert.isTrue(Number.isNaN(document.representation.literal))
  })

  it("decodes positive infinity structural values", () => {
    const document = SchemaRepresentation.fromJson({
      representation: {
        _tag: "Literal",
        literal: "Infinity",
        checks: []
      },
      references: {}
    })

    assert.strictEqual(document.representation._tag, "Literal")
    if (document.representation._tag !== "Literal") return
    assert.strictEqual(document.representation.literal, Number.POSITIVE_INFINITY)
  })

  it("decodes negative infinity structural values", () => {
    const document = SchemaRepresentation.fromJson({
      representation: {
        _tag: "Literal",
        literal: "-Infinity",
        checks: []
      },
      references: {}
    })

    assert.strictEqual(document.representation._tag, "Literal")
    if (document.representation._tag !== "Literal") return
    assert.strictEqual(document.representation.literal, Number.NEGATIVE_INFINITY)
  })

  it("decodes global symbols", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.fromJson({
        representation: {
          _tag: "UniqueSymbol",
          symbol: "Symbol(acme/schema/key)",
          checks: []
        },
        references: {}
      }),
      {
        representation: {
          _tag: "UniqueSymbol",
          symbol: Symbol.for("acme/schema/key"),
          checks: []
        },
        references: {}
      }
    )
  })

  it("does not coerce strings resembling symbols", () => {
    const input = {
      representation: { _tag: "Literal", literal: "Symbol(a)", checks: [] },
      references: {}
    } as const

    assert.deepStrictEqual(SchemaRepresentation.fromJson(input), input)
  })

  it("requires representation on persisted Filters", () => {
    throws(
      () =>
        SchemaRepresentation.fromJson({
          representation: { _tag: "String", checks: [{ _tag: "Filter", aborted: false }] },
          references: {}
        }),
      `Missing key\n  at ["representation"]["checks"][0]["representation"]`
    )
  })

  it("requires representation on persisted Declarations", () => {
    throws(
      () =>
        SchemaRepresentation.fromJson({
          representation: { _tag: "Declaration", typeParameters: [], checks: [] },
          references: {}
        }),
      `Missing key\n  at ["representation"]["representation"]`
    )
  })

  it("rejects empty references", () => {
    throws(
      () =>
        SchemaRepresentation.fromJson({
          representation: { _tag: "Reference", $ref: "" },
          references: {}
        }),
      `Expected a value with a length of at least 1, got ""\n  at ["representation"]["$ref"]`
    )
  })

  it("rejects non-JSON annotations", () => {
    throws(
      () =>
        SchemaRepresentation.fromJson({
          representation: {
            _tag: "String",
            annotations: { invalid: 1n },
            checks: []
          },
          references: {}
        } as never),
      `Expected JSON value, got 1n\n  at ["representation"]["annotations"]["invalid"]`
    )
  })

  it("rejects non-JSON roots", () => {
    const input = () => undefined
    throws(
      () => SchemaRepresentation.fromJson(input as never),
      `Expected object, got () => void 0`
    )
  })

  it("does not invoke toJSON", () => {
    let calls = 0
    const input = {
      representation: { _tag: "String", checks: [], unexpected: true },
      references: {},
      toJSON() {
        calls++
        return null
      }
    }

    assert.deepStrictEqual(
      SchemaRepresentation.fromJson(input as never),
      {
        representation: { _tag: "String", checks: [] },
        references: {}
      }
    )
    assert.strictEqual(calls, 0)
  })
})
