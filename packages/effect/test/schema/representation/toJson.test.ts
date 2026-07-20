import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

describe("SchemaRepresentation.toJson", () => {
  it("rejects invalid documents", () => {
    throws(
      () =>
        SchemaRepresentation.toJson({
          representation: { _tag: "Reference", $ref: "" },
          references: {}
        }),
      `Expected a value with a length of at least 1, got ""\n  at ["representation"]["$ref"]`
    )
  })

  it("requires representation when persisting a Filter", () => {
    throws(
      () =>
        SchemaRepresentation.toJson({
          representation: { _tag: "String", checks: [{ _tag: "Filter", aborted: false }] },
          references: {}
        }),
      `Missing key\n  at ["representation"]["checks"][0]["representation"]`
    )
  })

  it("removes live callbacks from a custom filter", () => {
    const filter = Schema.makeFilter<string>(() => true, {
      description: "custom",
      callback: () => "live",
      representation: {
        id: "acme/schema/custom",
        payload: { minimum: 1 },
        schemas: [Schema.Number.ast]
      },
      toCode: () => ({ runtime: "Custom" }),
      toJsonSchema: () => ({ minLength: 1 })
    }).abort()

    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(Schema.String.check(filter).ast)),
      {
        representation: {
          _tag: "String",
          checks: [{
            _tag: "Filter",
            representation: {
              id: "acme/schema/custom",
              payload: { minimum: 1 },
              schemas: [{ _tag: "Number", checks: [] }]
            },
            annotations: {
              description: "custom"
            },
            aborted: true
          }]
        },
        references: {}
      }
    )
  })

  it("removes live callbacks from a custom declaration", () => {
    const schema = Schema.declare<string>((input): input is string => typeof input === "string", {
      description: "custom",
      representation: { id: "acme/schema/custom", payload: null },
      toCode: () => ({ runtime: "Custom", Type: "string" }),
      toJsonSchema: () => ({ type: "string" })
    })

    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(schema.ast)),
      {
        representation: {
          _tag: "Declaration",
          representation: { id: "acme/schema/custom", payload: null },
          annotations: {
            description: "custom"
          },
          typeParameters: [],
          checks: []
        },
        references: {}
      }
    )
  })

  it("preserves JSON annotations", () => {
    const document = SchemaRepresentation.toRepresentation(
      Schema.String.annotate({ values: ["1", "Symbol(a)", "NaN"] }).ast
    )

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: { values: ["1", "Symbol(a)", "NaN"] },
        checks: []
      },
      references: {}
    })
  })

  it("preserves shared JSON annotation values", () => {
    const shared = { value: "shared" }
    const document = SchemaRepresentation.toRepresentation(
      Schema.String.annotate({ value: { left: shared, right: shared } }).ast
    )

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: {
          value: {
            left: { value: "shared" },
            right: { value: "shared" }
          }
        },
        checks: []
      },
      references: {}
    })
  })

  it("omits a cyclic annotation atomically", () => {
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    const document = SchemaRepresentation.toRepresentation(
      Schema.String.annotate({ cyclic, title: "kept" }).ast
    )

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: { title: "kept" },
        checks: []
      },
      references: {}
    })
  })

  it("omits a sparse-array annotation atomically", () => {
    const sparse = new Array<unknown>(1)
    const document = SchemaRepresentation.toRepresentation(
      Schema.String.annotate({ sparse, title: "kept" }).ast
    )

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: { title: "kept" },
        checks: []
      },
      references: {}
    })
  })

  it("omits an annotation containing bigint atomically", () => {
    const document = SchemaRepresentation.toRepresentation(
      Schema.String.annotate({ invalid: { value: 1n }, title: "kept" }).ast
    )

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: { title: "kept" },
        checks: []
      },
      references: {}
    })
  })

  it("omits an annotation containing undefined atomically", () => {
    const document = SchemaRepresentation.toRepresentation(
      Schema.String.annotate({ invalid: { value: undefined }, title: "kept" }).ast
    )

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: { title: "kept" },
        checks: []
      },
      references: {}
    })
  })

  it("encodes annotation accessors", () => {
    const accessor = {}
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get() {
        return "value"
      }
    })
    const document = SchemaRepresentation.toRepresentation(Schema.String.annotate({ accessor }).ast)

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: { accessor: { value: "value" } },
        checks: []
      },
      references: {}
    })
  })

  it("preserves filter groups without an identity", () => {
    const first = Schema.makeFilter<string>(() => true, {
      representation: { id: "acme/schema/first", payload: null }
    })
    const second = Schema.makeFilter<string>(() => true, {
      representation: { id: "acme/schema/second", payload: null }
    }).abort()
    const group = Schema.makeFilterGroup([first, second], { description: "both" })

    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(Schema.String.check(group).ast)),
      {
        representation: {
          _tag: "String",
          checks: [{
            _tag: "FilterGroup",
            annotations: { description: "both" },
            checks: [
              {
                _tag: "Filter",
                representation: { id: "acme/schema/first", payload: null },
                aborted: false
              },
              {
                _tag: "Filter",
                representation: { id: "acme/schema/second", payload: null },
                aborted: true
              }
            ]
          }]
        },
        references: {}
      }
    )
  })

  it("preserves tuple element annotations independently", () => {
    const schema = Schema.Tuple([
      Schema.String.annotateKey({ description: "element", callback: () => "live" })
    ])

    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(schema.ast)),
      {
        representation: {
          _tag: "Arrays",
          elements: [{
            type: { _tag: "String", checks: [] },
            isOptional: false,
            annotations: { description: "element" }
          }],
          rest: [],
          checks: []
        },
        references: {}
      }
    )
  })

  it("preserves property annotations independently", () => {
    const schema = Schema.Struct({
      value: Schema.String.annotateKey({ description: "property", callback: () => "live" })
    })

    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(schema.ast)),
      {
        representation: {
          _tag: "Objects",
          propertySignatures: [{
            name: "value",
            type: { _tag: "String", checks: [] },
            isOptional: false,
            isMutable: false,
            annotations: { description: "property" }
          }],
          indexSignatures: [],
          checks: []
        },
        references: {}
      }
    )
  })

  it("encodes bigint structural values", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(Schema.Literal(1n).ast)),
      {
        representation: {
          _tag: "Literal",
          literal: "1",
          checks: []
        },
        references: {}
      }
    )
  })

  it("encodes negative zero structural values", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(Schema.Literal(-0).ast)),
      {
        representation: {
          _tag: "Literal",
          literal: -0,
          checks: []
        },
        references: {}
      }
    )
  })

  it("preserves string literals resembling non-finite numbers", () => {
    for (const literal of ["NaN", "Infinity", "-Infinity"]) {
      assert.deepStrictEqual(
        SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(Schema.Literal(literal).ast)),
        {
          representation: { _tag: "Literal", literal, checks: [] },
          references: {}
        }
      )
    }
  })

  it("encodes global symbols", () => {
    assert.deepStrictEqual(
      SchemaRepresentation.toJson(
        SchemaRepresentation.toRepresentation(Schema.UniqueSymbol(Symbol.for("acme/schema/key")).ast)
      ),
      {
        representation: {
          _tag: "UniqueSymbol",
          symbol: "Symbol(acme/schema/key)",
          checks: []
        },
        references: {}
      }
    )
  })

  it("rejects local symbols", () => {
    throws(
      () =>
        SchemaRepresentation.toJson(
          SchemaRepresentation.toRepresentation(Schema.UniqueSymbol(Symbol("local")).ast)
        ),
      `cannot serialize to string, Symbol is not registered\n  at ["representation"]["symbol"]`
    )
  })

  it("encodes recursive references", () => {
    let schema: Schema.Codec<unknown>
    schema = Schema.suspend((): Schema.Codec<unknown> => schema)

    assert.deepStrictEqual(
      SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(schema.ast)),
      {
        representation: { _tag: "Reference", $ref: "Suspend_" },
        references: {
          Suspend_: {
            _tag: "Suspend",
            thunk: { _tag: "Reference", $ref: "Suspend_" },
            checks: []
          }
        }
      }
    )
  })

  it("encodes fromJsonString annotations", () => {
    const schema = SchemaAST.toEncoded(Schema.fromJsonString(Schema.Struct({ value: Schema.Number })).ast)
    const document = SchemaRepresentation.toRepresentation(schema)

    assert.deepStrictEqual(SchemaRepresentation.toJson(document), {
      representation: {
        _tag: "String",
        annotations: {
          contentMediaType: "application/json",
          expected: "a string that will be decoded as JSON"
        },
        checks: []
      },
      references: {}
    })
  })
})
