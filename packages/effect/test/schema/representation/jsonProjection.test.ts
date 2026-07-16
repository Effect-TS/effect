import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaRepresentation } from "effect"
import * as InternalRepresentation from "effect/internal/schema/representation"
import { throws } from "../../utils/assert.ts"

function project(
  document: SchemaRepresentation.Document
): SchemaRepresentation.Document {
  return InternalRepresentation.projectDocument(document)
}

function projectErrorMessage(
  document: SchemaRepresentation.Document
): string {
  let message: string | undefined
  throws(() => InternalRepresentation.projectDocument(document), (error: unknown) => {
    assert.instanceOf(error, Error)
    message = error.message
    return undefined
  })
  assert.isDefined(message)
  return message
}

describe("SchemaRepresentation JSON projection", () => {
  it("projects a custom check identity and removes live callbacks", () => {
    const payload = { expected: "a" }
    const marker = () => "live"
    const check = Schema.makeFilter<"a">(() => true, {
      description: "is a",
      marker,
      representation: {
        id: "acme/schema/isA",
        payload,
        schemas: [Schema.Number.ast]
      },
      toCode: () => ({ runtime: "Schema.makeFilter(() => true)" }),
      toJsonSchema: () => ({ const: "a" })
    }).abort()

    const representation = project(
      SchemaRepresentation.fromAST(Schema.Literal("a").check(check).ast)
    ).representation
    assert.strictEqual(representation._tag, "Literal")
    if (representation._tag !== "Literal") {
      return
    }
    const persistedCheck = representation.checks[0]
    assert.strictEqual(persistedCheck._tag, "Filter")
    if (persistedCheck._tag !== "Filter") {
      return
    }

    assert.isTrue(persistedCheck.aborted)
    assert.deepStrictEqual(persistedCheck.annotations, {
      description: "is a",
      representation: {
        id: "acme/schema/isA",
        payload: { expected: "a" },
        schemas: [{ _tag: "Number", checks: [] }]
      }
    })
    assert.isFalse("marker" in (persistedCheck.annotations ?? {}))
    assert.isFalse("toCode" in (persistedCheck.annotations ?? {}))
    assert.isFalse("toJsonSchema" in (persistedCheck.annotations ?? {}))
    assert.strictEqual(persistedCheck.annotations?.representation?.payload, payload)
  })

  it("projects a custom declaration without encoded-side state", () => {
    const schema = Schema.declare<string>((input): input is string => typeof input === "string", {
      description: "custom string",
      representation: {
        id: "acme/schema/CustomString",
        payload: null
      },
      toCode: () => ({ runtime: "CustomString", Type: "string" }),
      toJsonSchema: () => ({ type: "string" })
    })

    const representation = project(SchemaRepresentation.fromAST(schema.ast)).representation
    assert.strictEqual(representation._tag, "Declaration")
    if (representation._tag !== "Declaration") {
      return
    }
    assert.deepStrictEqual(representation.annotations, {
      description: "custom string",
      representation: {
        id: "acme/schema/CustomString",
        payload: null
      }
    })
    assert.isFalse("encodedSchema" in representation)
  })

  it("retains JSON annotations and omits invalid annotations atomically", () => {
    const shared = { value: "before" }
    const dag = { left: shared, right: shared }
    const cycle: { self?: unknown } = {}
    cycle.self = cycle
    const sparse = new Array<unknown>(1)
    const withBigInt = { nested: { value: 1n } }
    const withUndefined = { nested: undefined }

    const representation = project(SchemaRepresentation.fromAST(
      Schema.String.annotate({
        strings: ["1", "Symbol(a)", "NaN"],
        dag,
        cycle,
        sparse,
        withBigInt,
        withUndefined
      }).ast
    )).representation
    assert.strictEqual(representation._tag, "String")
    if (representation._tag !== "String") {
      return
    }

    assert.deepStrictEqual(representation.annotations?.strings, ["1", "Symbol(a)", "NaN"])
    assert.deepStrictEqual(representation.annotations?.dag, {
      left: { value: "before" },
      right: { value: "before" }
    })
    assert.isFalse("cycle" in (representation.annotations ?? {}))
    assert.isFalse("sparse" in (representation.annotations ?? {}))
    assert.isFalse("withBigInt" in (representation.annotations ?? {}))
    assert.isFalse("withUndefined" in (representation.annotations ?? {}))

    assert.strictEqual(representation.annotations?.dag, dag)
  })

  it("retains JSON annotations backed by accessors", () => {
    let calls = 0
    const accessor = {}
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get() {
        calls++
        return "value"
      }
    })

    const representation = project(SchemaRepresentation.fromAST(
      Schema.String.annotate({
        accessor,
        title: "kept"
      }).ast
    )).representation
    assert.strictEqual(calls, 1)
    assert.strictEqual(representation._tag, "String")
    if (representation._tag !== "String") {
      return
    }
    assert.strictEqual(representation.annotations?.title, "kept")
    assert.strictEqual(representation.annotations?.accessor, accessor)
  })

  it("preserves representation annotations on structural nodes", () => {
    const schema = Schema.String.annotate({
      representation: {
        id: "acme/schema/String",
        payload: null
      }
    })
    const representation = project(SchemaRepresentation.fromAST(schema.ast)).representation
    assert.strictEqual(representation._tag, "String")
    if (representation._tag === "String") {
      assert.deepStrictEqual(representation.annotations?.representation, {
        id: "acme/schema/String",
        payload: null
      })
    }
  })

  it("keeps group children and allows the group identity to be absent", () => {
    const first = Schema.makeFilter<string>(() => true, {
      representation: { id: "acme/schema/first", payload: null }
    })
    const second = Schema.makeFilter<string>(() => true, {
      representation: { id: "acme/schema/second", payload: null }
    }).abort()
    const group = Schema.makeFilterGroup([first, second], { description: "both" })

    const representation = project(
      SchemaRepresentation.fromAST(Schema.String.check(group).ast)
    ).representation
    assert.strictEqual(representation._tag, "String")
    if (representation._tag !== "String") {
      return
    }
    assert.deepStrictEqual(representation.checks, [{
      _tag: "FilterGroup",
      annotations: { description: "both" },
      checks: [
        {
          _tag: "Filter",
          annotations: {
            representation: { id: "acme/schema/first", payload: null }
          },
          aborted: false
        },
        {
          _tag: "Filter",
          annotations: {
            representation: { id: "acme/schema/second", payload: null }
          },
          aborted: true
        }
      ]
    }])
  })

  it("rejects representation and check cycles", () => {
    const cyclicRepresentation: any = { _tag: "Union", types: [], mode: "anyOf", checks: [] }
    cyclicRepresentation.types.push(cyclicRepresentation)
    assert.strictEqual(
      projectErrorMessage({ representation: cyclicRepresentation, references: {} }),
      `Invalid structural value\n  at ["representation"]["types"][0]`
    )

    const cyclicCheck: any = { _tag: "FilterGroup", checks: [] }
    cyclicCheck.checks.push(cyclicCheck)
    assert.strictEqual(
      projectErrorMessage({
        representation: { _tag: "String", checks: [cyclicCheck] },
        references: {}
      }),
      `Invalid structural value\n  at ["representation"]["checks"][0]["checks"][0]`
    )
  })

  it("projects tuple and property annotations independently", () => {
    const schema = Schema.Tuple([
      Schema.String.annotateKey({ description: "tuple", callback: () => "live" }),
      Schema.Struct({
        value: Schema.Number.annotateKey({ description: "property", callback: () => "live" })
      })
    ])
    const representation = project(SchemaRepresentation.fromAST(schema.ast)).representation
    assert.strictEqual(representation._tag, "Arrays")
    if (representation._tag !== "Arrays") {
      return
    }
    assert.deepStrictEqual(representation.elements[0].annotations, { description: "tuple" })
    const struct = representation.elements[1].type
    assert.strictEqual(struct._tag, "Objects")
    if (struct._tag !== "Objects") {
      return
    }
    assert.deepStrictEqual(struct.propertySignatures[0].annotations, { description: "property" })
  })

  it("preserves global symbols", () => {
    const globalSymbol = Symbol.for("acme/schema/global")
    const globalRepresentation = project(
      SchemaRepresentation.fromAST(Schema.UniqueSymbol(globalSymbol).ast)
    ).representation
    assert.strictEqual(globalRepresentation._tag, "UniqueSymbol")
    if (globalRepresentation._tag === "UniqueSymbol") {
      assert.strictEqual(globalRepresentation.symbol, globalSymbol)
    }
  })
})
