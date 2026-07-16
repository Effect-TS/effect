import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

const filterId = "acme/schema/minLength"

const minLengthReviver: SchemaRepresentation.FilterReviver<{ readonly minimum: number }> = {
  _tag: "Filter",
  id: filterId,
  payloadSchema: Schema.Struct({ minimum: Schema.Number }),
  schemasArity: 0,
  revive: ({ annotations, payload }) => minLengthCheck(payload.minimum, annotations)
}

function minLengthCheck(minimum: number, annotations?: Schema.Annotations.Filter) {
  return Schema.makeFilter<string>((value) => value.length >= minimum, {
    representation: { id: filterId, payload: { minimum } },
    ...annotations
  })
}

function revive(
  schema: Schema.Top,
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = []
): Schema.Top {
  return SchemaRepresentation.toSchema(
    SchemaRepresentation.fromJson(SchemaRepresentation.toJson(SchemaRepresentation.fromAST(schema.ast))),
    { revivers }
  )
}

function assertRepresentationRoundtrip(
  schema: Schema.Top,
  revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = []
): Schema.Top {
  const expected = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(schema.ast))
  const revived = SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(expected), { revivers })
  assert.deepStrictEqual(SchemaRepresentation.toJson(SchemaRepresentation.fromAST(revived.ast)), expected)
  return revived
}

function errorFrom(run: () => unknown): Error {
  let result: Error | undefined
  throws(run, (error: unknown) => {
    assert.instanceOf(error, Error)
    result = error
    return undefined
  })
  assert.isDefined(result)
  return result
}

function filterJson(): Schema.Json {
  return SchemaRepresentation.toJson(
    SchemaRepresentation.fromAST(Schema.String.check(minLengthCheck(2)).ast)
  )
}

describe("SchemaRepresentation.toSchema", () => {
  it("revives Null", () => {
    assertRepresentationRoundtrip(Schema.Null)
  })

  it("revives Undefined", () => {
    assertRepresentationRoundtrip(Schema.Undefined)
  })

  it("revives Void", () => {
    assertRepresentationRoundtrip(Schema.Void)
  })

  it("revives Never", () => {
    assertRepresentationRoundtrip(Schema.Never)
  })

  it("revives Unknown", () => {
    assertRepresentationRoundtrip(Schema.Unknown)
  })

  it("revives Any", () => {
    assertRepresentationRoundtrip(Schema.Any)
  })

  it("revives String", () => {
    assertRepresentationRoundtrip(Schema.String)
  })

  it("revives Number", () => {
    assertRepresentationRoundtrip(Schema.Number)
  })

  it("revives Boolean", () => {
    assertRepresentationRoundtrip(Schema.Boolean)
  })

  it("revives BigInt", () => {
    assertRepresentationRoundtrip(Schema.BigInt)
  })

  it("revives Symbol", () => {
    assertRepresentationRoundtrip(Schema.Symbol)
  })

  it("revives ObjectKeyword", () => {
    assertRepresentationRoundtrip(Schema.ObjectKeyword)
  })

  it("revives Literal", () => {
    const schema = assertRepresentationRoundtrip(Schema.Literal("value"))
    assert.isTrue(Schema.is(schema)("value"))
    assert.isFalse(Schema.is(schema)("other"))
  })

  it("revives UniqueSymbol", () => {
    const symbol = Symbol.for("acme/schema/symbol")
    const schema = assertRepresentationRoundtrip(Schema.UniqueSymbol(symbol))
    assert.isTrue(Schema.is(schema)(symbol))
    assert.isFalse(Schema.is(schema)(Symbol.for("acme/schema/other")))
  })

  it("revives Enum", () => {
    const schema = assertRepresentationRoundtrip(Schema.Enum({ A: "a", One: 1 }))
    assert.isTrue(Schema.is(schema)("a"))
    assert.isTrue(Schema.is(schema)(1))
    assert.isFalse(Schema.is(schema)("other"))
  })

  it("revives TemplateLiteral", () => {
    const schema = assertRepresentationRoundtrip(Schema.TemplateLiteral(["prefix-", Schema.String]))
    assert.isTrue(Schema.is(schema)("prefix-value"))
    assert.isFalse(Schema.is(schema)("value"))
  })

  it("revives Tuple", () => {
    assertRepresentationRoundtrip(Schema.Tuple([Schema.String, Schema.optionalKey(Schema.Number)]))
  })

  it("revives Array", () => {
    assertRepresentationRoundtrip(Schema.Array(Schema.String))
  })

  it("revives TupleWithRest", () => {
    assertRepresentationRoundtrip(
      Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number, Schema.Boolean])
    )
  })

  it("revives Struct", () => {
    assertRepresentationRoundtrip(Schema.Struct({
      required: Schema.String,
      optional: Schema.optionalKey(Schema.Number),
      mutable: Schema.mutableKey(Schema.Boolean)
    }))
  })

  it("revives Record", () => {
    assertRepresentationRoundtrip(Schema.Record(Schema.String, Schema.Number))
  })

  it("revives StructWithRest", () => {
    assertRepresentationRoundtrip(
      Schema.StructWithRest(Schema.Struct({ value: Schema.Number }), [Schema.Record(Schema.Symbol, Schema.String)])
    )
  })

  it("revives Union", () => {
    const schema = assertRepresentationRoundtrip(Schema.Union([Schema.String, Schema.Number]))
    assert.isTrue(Schema.is(schema)("value"))
    assert.isTrue(Schema.is(schema)(1))
    assert.isFalse(Schema.is(schema)(true))
  })

  it("revives an empty Union as Never", () => {
    const schema = SchemaRepresentation.toSchema({
      representation: { _tag: "Union", types: [], mode: "anyOf", checks: [] },
      references: {}
    }, { revivers: [] })
    assert.isFalse(Schema.is(schema)(undefined))
    assert.isFalse(Schema.is(schema)(null))
  })

  it("revives Suspend", () => {
    interface Category {
      readonly name: string
      readonly children: ReadonlyArray<Category>
    }
    const Category: Schema.Codec<Category> = Schema.Struct({
      name: Schema.String,
      children: Schema.Array(Schema.suspend((): Schema.Codec<Category> => Category))
    }).annotate({ identifier: "Category" })
    const schema = revive(Category) as Schema.Codec<unknown>
    assert.deepStrictEqual(
      Schema.decodeUnknownSync(schema)({
        name: "root",
        children: [{ name: "child", children: [] }]
      }),
      {
        name: "root",
        children: [{ name: "child", children: [] }]
      }
    )
    assert.strictEqual(SchemaRepresentation.fromAST(schema.ast).representation._tag, "Reference")
  })

  it("restores node annotations", () => {
    const schema = revive(Schema.String.annotate({ title: "Name" }))
    assert.strictEqual(schema.ast.annotations?.title, "Name")
  })

  it("restores tuple element annotations", () => {
    const schema = revive(Schema.Tuple([Schema.String.annotateKey({ description: "element" })]))
    const representation = SchemaRepresentation.fromAST(schema.ast).representation
    assert.strictEqual(representation._tag, "Arrays")
    if (representation._tag === "Arrays") {
      assert.strictEqual(representation.elements[0].annotations?.description, "element")
    }
  })

  it("restores property annotations", () => {
    const schema = revive(Schema.Struct({ value: Schema.String.annotateKey({ description: "property" }) }))
    const representation = SchemaRepresentation.fromAST(schema.ast).representation
    assert.strictEqual(representation._tag, "Objects")
    if (representation._tag === "Objects") {
      assert.strictEqual(representation.propertySignatures[0].annotations?.description, "property")
    }
  })

  it("restores brands", () => {
    assertRepresentationRoundtrip(Schema.String.pipe(Schema.brand("A"), Schema.brand("B")))
  })

  it("restores a node representation annotation without schema dependencies", () => {
    assertRepresentationRoundtrip(Schema.String.annotate({
      representation: { id: "acme/schema/String", payload: null }
    }))
  })

  it("restores a node representation annotation with schema dependencies", () => {
    assertRepresentationRoundtrip(Schema.String.annotate({
      representation: {
        id: "acme/schema/String",
        payload: null,
        schemas: [Schema.Number.ast]
      }
    }))
  })

  it("revives String contentSchema in the same reference environment", () => {
    const content = Schema.Struct({ value: Schema.Number }).annotate({ identifier: "Payload" })
    const encoded = Schema.String.annotate({
      contentMediaType: "application/json",
      contentSchema: SchemaAST.toEncoded(content.ast)
    })
    const schema = revive(encoded)
    assert.deepStrictEqual(Schema.decodeUnknownSync(schema as Schema.Codec<unknown>)("{\"value\":1}"), { value: 1 })
    const document = SchemaRepresentation.fromAST(SchemaAST.toEncoded(schema.ast))
    assert.strictEqual(document.representation._tag, "Reference")
    if (document.representation._tag === "Reference") {
      const representation = document.references[document.representation.$ref]
      assert.strictEqual(representation._tag, "String")
      if (representation._tag === "String") {
        assert.strictEqual(representation.contentMediaType, "application/json")
        assert.strictEqual(representation.contentSchema?._tag, "Reference")
      }
    }
  })

  it("revives a Filter", () => {
    const schema = assertRepresentationRoundtrip(
      Schema.String.check(minLengthCheck(2, { description: "at least two" }).abort()),
      [minLengthReviver]
    )
    assert.strictEqual(Schema.decodeUnknownResult(schema as Schema.Codec<unknown>)("a")._tag, "Failure")
    assert.strictEqual(schema.ast.checks?.[0]._tag, "Filter")
    assert.isTrue(schema.ast.checks?.[0]._tag === "Filter" && schema.ast.checks[0].aborted)
    assert.strictEqual(schema.ast.checks?.[0].annotations?.description, "at least two")
  })

  it("revives a FilterGroup without an identity from its children", () => {
    const group = Schema.makeFilterGroup([minLengthCheck(2), minLengthCheck(3)], { description: "both" })
    const schema = assertRepresentationRoundtrip(Schema.String.check(group), [minLengthReviver])
    assert.strictEqual(Schema.decodeUnknownResult(schema as Schema.Codec<unknown>)("ab")._tag, "Failure")
    assert.strictEqual(schema.ast.checks?.[0].annotations?.description, "both")
  })

  it("uses an identified FilterGroup reviver instead of its persisted children", () => {
    const groupId = "acme/schema/group"
    const document = SchemaRepresentation.fromJson({
      representation: {
        _tag: "String",
        checks: [{
          _tag: "FilterGroup",
          annotations: { representation: { id: groupId, payload: null } },
          checks: [{ _tag: "Filter", aborted: false }]
        }]
      },
      references: {}
    })
    const reviver: SchemaRepresentation.FilterGroupReviver<null> = {
      _tag: "FilterGroup",
      id: groupId,
      payloadSchema: Schema.Null,
      schemasArity: 0,
      revive: () => Schema.makeFilterGroup([Schema.makeFilter<string>((value) => value !== "blocked")])
    }
    const schema = SchemaRepresentation.toSchema(document, { revivers: [reviver] }) as Schema.Codec<unknown>
    assert.strictEqual(Schema.decodeUnknownSync(schema)("allowed"), "allowed")
    assert.strictEqual(Schema.decodeUnknownResult(schema)("blocked")._tag, "Failure")
  })

  it("revives a Declaration", () => {
    const id = "acme/schema/Box"
    const Box = Schema.declare<{ readonly value: string }>(
      (input): input is { readonly value: string } =>
        typeof input === "object" && input !== null && typeof (input as any).value === "string",
      { representation: { id, payload: { label: "Box" }, schemas: [Schema.String.ast] } }
    )
    const reviver: SchemaRepresentation.DeclarationReviver<{ readonly label: string }> = {
      _tag: "Declaration",
      id,
      payloadSchema: Schema.Struct({ label: Schema.String }),
      schemasArity: 1,
      typeParametersArity: 0,
      revive: ({ annotations, payload, schemas }) =>
        Schema.declare<{ readonly value: string }>(
          (input): input is { readonly value: string } =>
            typeof input === "object" && input !== null && typeof (input as any).value === "string",
          { ...annotations, representation: { id, payload, schemas: schemas.map((schema) => schema.ast) } }
        )
    }
    const schema = assertRepresentationRoundtrip(Box, [reviver]) as Schema.Codec<unknown>
    assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({ value: "ok" }), { value: "ok" })
  })

  it("reports a missing reviver", () => {
    assert.strictEqual(
      errorFrom(() => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), { revivers: [] }))
        .message,
      `Missing reviver for ${filterId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )
  })

  it("rejects duplicate reviver IDs", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema({
          representation: { _tag: "String", checks: [] },
          references: {}
        }, { revivers: [minLengthReviver, minLengthReviver] })
      ).message,
      `Duplicate reviver for ${filterId}\n  at ["revivers"][1]["id"]`
    )
  })

  it("rejects an invalid declared schemasArity", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), {
          revivers: [{ ...minLengthReviver, schemasArity: -1 }]
        })
      ).message,
      `Invalid schemasArity for ${filterId}\n  at ["revivers"][0]["schemasArity"]`
    )
  })

  it("rejects an invalid effective schemas arity", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), {
          revivers: [{ ...minLengthReviver, schemasArity: 1 }]
        })
      ).message,
      `Invalid schemas arity for ${filterId}: expected 1, got 0\n  at ["representation"]["checks"][0]["annotations"]["representation"]["schemas"]`
    )
  })

  it("rejects an invalid declared typeParametersArity", () => {
    const id = "acme/schema/Declaration"
    const reviver: SchemaRepresentation.DeclarationReviver<null> = {
      _tag: "Declaration",
      id,
      payloadSchema: Schema.Null,
      schemasArity: 0,
      typeParametersArity: 0.5,
      revive: () => Schema.String
    }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema({
          representation: { _tag: "String", checks: [] },
          references: {}
        }, { revivers: [reviver] })
      ).message,
      `Invalid typeParametersArity for ${id}\n  at ["revivers"][0]["typeParametersArity"]`
    )
  })

  it("rejects an invalid effective type parameters arity", () => {
    const id = "acme/schema/Declaration"
    const declaration = Schema.declare<string>((input): input is string => typeof input === "string", {
      representation: { id, payload: null }
    })
    const reviver: SchemaRepresentation.DeclarationReviver<null> = {
      _tag: "Declaration",
      id,
      payloadSchema: Schema.Null,
      schemasArity: 0,
      typeParametersArity: 1,
      revive: () => Schema.String
    }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson(SchemaRepresentation.toJson(SchemaRepresentation.fromAST(declaration.ast))),
          { revivers: [reviver] }
        )
      ).message,
      `Invalid type parameters arity for ${id}: expected 1, got 0\n  at ["representation"]["typeParameters"]`
    )
  })

  it("rejects an invalid reviver payload", () => {
    const json = filterJson() as any
    json.representation.checks[0].annotations.representation.payload = { minimum: "two" }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), {
          revivers: [minLengthReviver]
        })
      ).message,
      `Invalid representation payload for ${filterId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
    )
  })

  it("rejects a reviver of the wrong kind", () => {
    const wrongKind: SchemaRepresentation.DeclarationReviver<{ readonly minimum: number }> = {
      _tag: "Declaration",
      id: filterId,
      payloadSchema: Schema.Struct({ minimum: Schema.Number }),
      schemasArity: 0,
      typeParametersArity: 0,
      revive: () => Schema.String
    }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), {
          revivers: [wrongKind]
        })
      ).message,
      `Invalid reviver kind for ${filterId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )
  })

  it("preserves a reviver exception by identity", () => {
    const cause = new Error("boom")
    const reviver = {
      ...minLengthReviver,
      revive: () => {
        throw cause
      }
    }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), {
          revivers: [reviver]
        })
      ),
      cause
    )
  })

  it("requires a representation identity on a Filter", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({
            representation: { _tag: "String", checks: [{ _tag: "Filter", aborted: false }] },
            references: {}
          }),
          { revivers: [] }
        )
      ).message,
      `Missing representation annotation\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )
  })

  it("requires a representation identity on a Declaration", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({
            representation: { _tag: "Declaration", typeParameters: [], checks: [] },
            references: {}
          }),
          { revivers: [] }
        )
      ).message,
      `Missing representation annotation\n  at ["representation"]["annotations"]["representation"]`
    )
  })

  it("reports an invalid reference", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema({
          representation: { _tag: "Reference", $ref: "Missing" },
          references: {}
        }, { revivers: [] })
      ).message,
      `Invalid reference Missing\n  at ["representation"]["$ref"]`
    )
  })
})
