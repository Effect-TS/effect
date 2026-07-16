import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaAST, SchemaRepresentation } from "effect"

describe("SchemaRepresentation forward IR", () => {
  it("uses the type side unless the caller projects the encoded side", () => {
    const typeDocument = SchemaRepresentation.fromAST(Schema.NumberFromString.ast)
    const encodedDocument = SchemaRepresentation.fromAST(SchemaAST.toEncoded(Schema.NumberFromString.ast))

    assert.strictEqual(typeDocument.representation._tag, "Number")
    assert.strictEqual(encodedDocument.representation._tag, "String")
  })

  it("preserves live declaration annotations without encodedSchema", () => {
    const toCode: SchemaRepresentation.Generation.Declaration = () => ({
      runtime: "Custom",
      Type: "string"
    })
    const toJsonSchema: SchemaRepresentation.ToJsonSchema.Declaration = () => ({ type: "string" })
    const Custom = Schema.declare<string>((input): input is string => typeof input === "string", {
      representation: {
        id: "acme/schema/Custom",
        payload: null,
        schemas: [Schema.Number.ast]
      },
      toCode,
      toJsonSchema
    })

    const representation = SchemaRepresentation.fromAST(Custom.ast).representation
    assert.strictEqual(representation._tag, "Declaration")
    if (representation._tag !== "Declaration") {
      return
    }

    assert.isFalse("encodedSchema" in representation)
    assert.strictEqual(representation.annotations?.toCode, toCode)
    assert.strictEqual(representation.annotations?.toJsonSchema, toJsonSchema)
    assert.deepStrictEqual(representation.annotations?.representation, {
      id: "acme/schema/Custom",
      payload: null,
      schemas: [{ _tag: "Number", checks: [] }]
    })
  })

  it("keeps custom checks on literals, their callbacks, dependencies and aborted state", () => {
    const toJsonSchema: SchemaRepresentation.ToJsonSchema.Check = () => ({})
    const toCode: SchemaRepresentation.Generation.Check = () => ({
      runtime: "Schema.makeFilter(() => true)"
    })
    const marker = () => "live"
    const check = Schema.makeFilter<"a">(() => true, {
      representation: {
        id: "acme/schema/isA",
        payload: { expected: "a" },
        schemas: [Schema.Number.ast]
      },
      toJsonSchema,
      toCode,
      marker
    }).abort()

    const representation = SchemaRepresentation.fromAST(Schema.Literal("a").check(check).ast).representation
    assert.strictEqual(representation._tag, "Literal")
    if (representation._tag !== "Literal") {
      return
    }

    assert.strictEqual(representation.checks.length, 1)
    const persistedCheck = representation.checks[0]
    assert.strictEqual(persistedCheck._tag, "Filter")
    if (persistedCheck._tag !== "Filter") {
      return
    }

    assert.isTrue(persistedCheck.aborted)
    assert.strictEqual(persistedCheck.annotations?.toJsonSchema, toJsonSchema)
    assert.strictEqual(persistedCheck.annotations?.toCode, toCode)
    assert.strictEqual(persistedCheck.annotations?.marker, marker)
    assert.deepStrictEqual(persistedCheck.annotations?.representation, {
      id: "acme/schema/isA",
      payload: { expected: "a" },
      schemas: [{ _tag: "Number", checks: [] }]
    })
  })

  it("preserves groups and leaves without persistence metadata", () => {
    const first = Schema.makeFilter<string>((value) => value.length > 0, { expected: "non-empty" })
    const second = Schema.makeFilter<string>((value) => value !== "forbidden", { expected: "allowed" })
    const schema = Schema.String.check(
      Schema.makeFilterGroup([first, second], { description: "both checks" })
    )

    const representation = SchemaRepresentation.fromAST(schema.ast).representation
    assert.strictEqual(representation._tag, "String")
    if (representation._tag !== "String") {
      return
    }

    assert.deepStrictEqual(representation.checks, [{
      _tag: "FilterGroup",
      annotations: { description: "both checks" },
      checks: [
        {
          _tag: "Filter",
          annotations: { expected: "non-empty" },
          aborted: false
        },
        {
          _tag: "Filter",
          annotations: { expected: "allowed" },
          aborted: false
        }
      ]
    }])
  })

  it("promotes string content annotations to structural fields", () => {
    const schema = Schema.fromJsonString(Schema.Struct({ value: Schema.Number }))
    const encoded = SchemaAST.toEncoded(schema.ast)
    const representation = SchemaRepresentation.fromAST(encoded).representation

    assert.strictEqual(representation._tag, "String")
    if (representation._tag !== "String") {
      return
    }

    assert.strictEqual(representation.contentMediaType, "application/json")
    assert.strictEqual(representation.contentSchema?._tag, "Objects")
    assert.isFalse("contentMediaType" in (representation.annotations ?? {}))
    assert.isFalse("contentSchema" in (representation.annotations ?? {}))
  })

  it("preserves tuple and property key annotations", () => {
    const tupleMarker = () => "tuple"
    const propertyMarker = () => "property"
    const schema = Schema.Tuple([
      Schema.String.annotateKey({ description: "tuple element", marker: tupleMarker }),
      Schema.Struct({
        value: Schema.Number.annotateKey({ description: "property", marker: propertyMarker })
      })
    ])

    const representation = SchemaRepresentation.fromAST(schema.ast).representation
    assert.strictEqual(representation._tag, "Arrays")
    if (representation._tag !== "Arrays") {
      return
    }

    assert.strictEqual(representation.elements[0].annotations?.marker, tupleMarker)
    const struct = representation.elements[1].type
    assert.strictEqual(struct._tag, "Objects")
    if (struct._tag !== "Objects") {
      return
    }
    assert.strictEqual(struct.propertySignatures[0].annotations?.marker, propertyMarker)
  })

  it("shares named references across roots", () => {
    const shared = Schema.String.annotate({ identifier: "Shared" })
    const document = SchemaRepresentation.fromASTs([shared.ast, shared.ast])

    assert.deepStrictEqual(document.representations, [
      { _tag: "Reference", $ref: "Shared" },
      { _tag: "Reference", $ref: "Shared" }
    ])
    assert.deepStrictEqual(document.references.Shared, {
      _tag: "String",
      annotations: { identifier: "Shared" },
      checks: []
    })
  })

  it("extracts anonymous recursion into a reference", () => {
    let recursive: Schema.Codec<unknown>
    recursive = Schema.suspend((): Schema.Codec<unknown> => recursive)

    const document = SchemaRepresentation.fromAST(recursive.ast)
    assert.strictEqual(document.representation._tag, "Reference")
    assert.deepStrictEqual(Object.keys(document.references), ["Suspend_"])
    assert.deepStrictEqual(document.references.Suspend_, {
      _tag: "Suspend",
      checks: [],
      thunk: { _tag: "Reference", $ref: "Suspend_" }
    })
  })
})
