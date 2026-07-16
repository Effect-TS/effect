import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

const filterId = "acme/schema/minLength"
const minLengthRuntimeMarker = () => "runtime"

const minLengthReviver: SchemaRepresentation.FilterReviver<{ readonly minimum: number }> = {
  _tag: "Filter",
  id: filterId,
  payloadSchema: Schema.Struct({ minimum: Schema.Number }),
  schemasArity: 0,
  revive: ({ payload, annotations }) => minLengthCheck(payload.minimum, annotations)
}

function minLengthCheck(minimum: number, annotations?: Schema.Annotations.Filter) {
  return Schema.makeFilter<string>((value) => value.length >= minimum, {
    representation: { id: filterId, payload: { minimum } },
    runtimeMarker: minLengthRuntimeMarker,
    ...annotations
  })
}

function filterJson(aborted = false): Schema.Json {
  const check = aborted ? minLengthCheck(2).abort() : minLengthCheck(2)
  return SchemaRepresentation.toJson(
    SchemaRepresentation.fromAST(Schema.String.check(check).ast)
  )
}

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
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

describe("SchemaRepresentation JSON revival", () => {
  it("roundtrips custom leaf checks, ordinary annotations and aborted state", () => {
    const json = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(
        Schema.String
          .annotate({ title: "Name" })
          .check(minLengthCheck(2, { description: "at least two", expected: "a longer string" }).abort())
          .ast
      )
    )
    const schema = SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), {
      revivers: [minLengthReviver]
    })

    assert.strictEqual(Schema.decodeUnknownSync(noServices(schema))("ab"), "ab")
    assert.isTrue(Schema.decodeUnknownResult(noServices(schema))("a")._tag === "Failure")
    assert.strictEqual(schema.ast.annotations?.title, "Name")
    assert.strictEqual(schema.ast.checks?.[0].annotations?.description, "at least two")
    assert.strictEqual(schema.ast.checks?.[0].annotations?.runtimeMarker, minLengthRuntimeMarker)
    assert.isTrue(schema.ast.checks?.[0]._tag === "Filter" && schema.ast.checks[0].aborted)
  })

  it("restores ordinary node, tuple and property annotations", () => {
    const original = Schema.Tuple([
      Schema.String.annotateKey({ description: "tuple element" }),
      Schema.Struct({
        value: Schema.Number.annotateKey({ description: "property value" })
      })
    ]).annotate({ title: "Container" })
    const revived = SchemaRepresentation.toSchema(
      SchemaRepresentation.fromJson(SchemaRepresentation.toJson(SchemaRepresentation.fromAST(original.ast))),
      { revivers: [] }
    )
    const representation = SchemaRepresentation.fromAST(revived.ast).representation

    assert.strictEqual(representation._tag, "Arrays")
    if (representation._tag === "Arrays") {
      assert.strictEqual(representation.annotations?.title, "Container")
      assert.strictEqual(representation.elements[0].annotations?.description, "tuple element")
      const object = representation.elements[1].type
      assert.strictEqual(object._tag, "Objects")
      if (object._tag === "Objects") {
        assert.strictEqual(object.propertySignatures[0].annotations?.description, "property value")
      }
    }
  })

  it("roundtrips a custom declaration and lets its constructor restore runtime annotations", () => {
    const runtimeMarker = () => "restored"
    const declarationId = "acme/schema/Box"
    const Box = Schema.declare<{ readonly value: string }>(
      (input): input is { readonly value: string } =>
        typeof input === "object" && input !== null && typeof (input as any).value === "string",
      {
        description: "a box",
        representation: {
          id: declarationId,
          payload: { label: "Box" },
          schemas: [Schema.String.ast]
        }
      }
    )
    const reviver: SchemaRepresentation.DeclarationReviver<{ readonly label: string }> = {
      _tag: "Declaration",
      id: declarationId,
      payloadSchema: Schema.Struct({ label: Schema.String }),
      schemasArity: 1,
      typeParametersArity: 0,
      revive: ({ annotations, payload, schemas }) =>
        Schema.declare<{ readonly value: string }>(
          (input): input is { readonly value: string } =>
            typeof input === "object" && input !== null && typeof (input as any).value === "string",
          {
            ...annotations,
            runtimeMarker,
            representation: {
              id: declarationId,
              payload,
              schemas: schemas.map((schema) => schema.ast)
            }
          }
        )
    }

    const schema = SchemaRepresentation.toSchema(
      SchemaRepresentation.fromJson(SchemaRepresentation.toJson(SchemaRepresentation.fromAST(Box.ast))),
      { revivers: [reviver] }
    )

    assert.deepStrictEqual(Schema.decodeUnknownSync(noServices(schema))({ value: "ok" }), { value: "ok" })
    assert.strictEqual(schema.ast._tag, "Declaration")
    if (schema.ast._tag === "Declaration") {
      assert.strictEqual(schema.ast.annotations?.description, "a box")
      assert.strictEqual(schema.ast.annotations?.runtimeMarker, runtimeMarker)
      const representation = schema.ast.annotations?.representation as
        | SchemaRepresentation.RepresentationAnnotation<SchemaAST.AST>
        | undefined
      assert.strictEqual(representation?.schemas?.[0]._tag, "String")
    }
  })

  it("reports a missing reviver at the persistence identity", () => {
    assert.strictEqual(
      errorFrom(() => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), { revivers: [] }))
        .message,
      `Missing reviver for ${filterId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )
  })

  it("rejects duplicate IDs before traversing the document", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({ representation: { _tag: "String", checks: [] }, references: {} }),
          { revivers: [minLengthReviver, minLengthReviver] }
        )
      ).message,
      `Duplicate reviver for ${filterId}\n  at ["revivers"][1]["id"]`
    )
  })

  it("validates declared and effective arities", () => {
    const invalidDeclared = { ...minLengthReviver, schemasArity: -1 }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), { revivers: [invalidDeclared] })
      ).message,
      `Invalid schemasArity for ${filterId}\n  at ["revivers"][0]["schemasArity"]`
    )

    const expectsSchema = { ...minLengthReviver, schemasArity: 1 }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), { revivers: [expectsSchema] })
      ).message,
      `Invalid schemas arity for ${filterId}: expected 1, got 0\n  at ["representation"]["checks"][0]["annotations"]["representation"]["schemas"]`
    )

    const declarationId = "acme/schema/Declaration"
    const declaration = Schema.declare<string>((input): input is string => typeof input === "string", {
      representation: { id: declarationId, payload: null }
    })
    const declarationJson = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(declaration.ast))
    const invalidTypeParameters: SchemaRepresentation.DeclarationReviver<null> = {
      _tag: "Declaration",
      id: declarationId,
      payloadSchema: Schema.Null,
      schemasArity: 0,
      typeParametersArity: 1,
      revive: () => Schema.String
    }
    const invalidDeclaredTypeParameters = { ...invalidTypeParameters, typeParametersArity: 0.5 }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({ representation: { _tag: "String", checks: [] }, references: {} }),
          { revivers: [invalidDeclaredTypeParameters] }
        )
      ).message,
      `Invalid typeParametersArity for ${declarationId}\n  at ["revivers"][0]["typeParametersArity"]`
    )
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(declarationJson), {
          revivers: [invalidTypeParameters]
        })
      ).message,
      `Invalid type parameters arity for ${declarationId}: expected 1, got 0\n  at ["representation"]["typeParameters"]`
    )
  })

  it("validates payloads and reviver kinds and preserves callback exceptions", () => {
    const invalidPayload = filterJson() as any
    invalidPayload.representation.checks[0].annotations.representation.payload = { minimum: "two" }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(invalidPayload), { revivers: [minLengthReviver] })
      ).message,
      `Invalid representation payload for ${filterId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]["payload"]`
    )

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
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), { revivers: [wrongKind] })
      ).message,
      `Invalid reviver kind for ${filterId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )

    const cause = new Error("boom")
    const throwing = {
      ...minLengthReviver,
      revive: () => {
        throw cause
      }
    }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(filterJson()), { revivers: [throwing] })
      ),
      cause
    )
  })

  it("falls back to group children only when the group has no identity", () => {
    const group = Schema.makeFilterGroup([
      minLengthCheck(2),
      minLengthCheck(3)
    ], { description: "both" })
    const fallback = SchemaRepresentation.toSchema(
      SchemaRepresentation.fromJson(SchemaRepresentation.toJson(
        SchemaRepresentation.fromAST(Schema.String.check(group).ast)
      )),
      { revivers: [minLengthReviver] }
    )
    assert.isTrue(Schema.decodeUnknownResult(noServices(fallback))("ab")._tag === "Failure")
    assert.strictEqual(fallback.ast.checks?.[0].annotations?.description, "both")

    const groupId = "acme/schema/group"
    const authoritativeJson: any = {
      representation: {
        _tag: "String",
        checks: [{
          _tag: "FilterGroup",
          annotations: {
            description: "authoritative",
            representation: { id: groupId, payload: null }
          },
          checks: [{ _tag: "Filter", aborted: false }]
        }]
      },
      references: {}
    }
    const authoritative: SchemaRepresentation.FilterGroupReviver<null> = {
      _tag: "FilterGroup",
      id: groupId,
      payloadSchema: Schema.Null,
      schemasArity: 0,
      revive: ({ annotations }) =>
        Schema.makeFilterGroup([
          Schema.makeFilter<string>((value) => value !== "blocked")
        ], annotations)
    }
    const revived = SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(authoritativeJson), {
      revivers: [authoritative]
    })
    assert.strictEqual(Schema.decodeUnknownSync(noServices(revived))("allowed"), "allowed")
    assert.isTrue(Schema.decodeUnknownResult(noServices(revived))("blocked")._tag === "Failure")

    const wrongKind = { ...minLengthReviver, id: groupId }
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(authoritativeJson), { revivers: [wrongKind] })
      ).message,
      `Invalid reviver kind for ${groupId}\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )
  })

  it("requires persistence identities on declarations and leaf checks", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({
            representation: {
              _tag: "String",
              checks: [{ _tag: "Filter", aborted: false }]
            },
            references: {}
          }),
          { revivers: [] }
        )
      ).message,
      `Missing representation annotation\n  at ["representation"]["checks"][0]["annotations"]["representation"]`
    )

    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({
            representation: {
              _tag: "Declaration",
              typeParameters: [],
              checks: []
            },
            references: {}
          }),
          { revivers: [] }
        )
      ).message,
      `Missing representation annotation\n  at ["representation"]["annotations"]["representation"]`
    )
  })

  it("reconstructs String.contentSchema in the same reference environment", () => {
    const content = Schema.Struct({ value: Schema.Number }).annotate({ identifier: "Payload" })
    const encoded = Schema.String
      .annotate({
        contentMediaType: "application/json",
        contentSchema: SchemaAST.toEncoded(content.ast)
      })
      .check(minLengthCheck(2, { message: "wire check ran first" }))
    const schema = SchemaRepresentation.toSchema(
      SchemaRepresentation.fromJson(SchemaRepresentation.toJson(SchemaRepresentation.fromAST(encoded.ast))),
      { revivers: [minLengthReviver] }
    )

    assert.deepStrictEqual(Schema.decodeUnknownSync(noServices(schema))("{\"value\":1}"), { value: 1 })
    const wireFailure = Schema.decodeUnknownResult(noServices(schema))("x")
    assert.strictEqual(wireFailure._tag, "Failure")
    if (wireFailure._tag === "Failure") {
      assert.isTrue(wireFailure.failure.message.includes("wire check ran first"))
    }
  })

  it("preserves multi-root order, unreachable definitions, aliases and recursion", () => {
    const json = {
      representations: [
        { _tag: "Reference", $ref: "Alias" },
        { _tag: "Boolean", checks: [] },
        { _tag: "Reference", $ref: "Recursive" }
      ],
      references: {
        Value: { _tag: "String", checks: [] },
        Alias: { _tag: "Reference", $ref: "Value" },
        Unused: { _tag: "Number", checks: [] },
        Recursive: {
          _tag: "Objects",
          annotations: { identifier: "RecursiveBody" },
          checks: [],
          propertySignatures: [
            {
              name: "value",
              type: { _tag: "Number", checks: [] },
              isOptional: false,
              isMutable: false
            },
            {
              name: "next",
              type: { _tag: "Reference", $ref: "Recursive" },
              isOptional: true,
              isMutable: false
            }
          ],
          indexSignatures: []
        }
      }
    }
    const document = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: []
    })

    assert.strictEqual(document.schemas.length, 3)
    assert.strictEqual(Schema.decodeUnknownSync(noServices(document.schemas[0]))("ok"), "ok")
    assert.strictEqual(Schema.decodeUnknownSync(noServices(document.schemas[1]))(true), true)
    assert.deepStrictEqual(
      Schema.decodeUnknownSync(noServices(document.schemas[2]))({
        value: 1,
        next: { value: 2 }
      }),
      { value: 1, next: { value: 2 } }
    )
    assert.deepStrictEqual(Object.keys(document.definitions), ["Value", "Alias", "Unused", "Recursive"])
    assert.notStrictEqual(document.definitions.Value, document.definitions.Alias)
    assert.strictEqual(document.definitions.Value.ast._tag, "Suspend")
    assert.strictEqual(document.definitions.Alias.ast._tag, "Suspend")

    const lowered = SchemaRepresentation.fromAST(document.schemas[0].ast)
    assert.deepStrictEqual(lowered.representation, { _tag: "Reference", $ref: "Alias" })
    assert.isDefined(lowered.references.Value)
    assert.isDefined(lowered.references.Alias)
  })

  it("reports invalid references and reuses persisted codec failures", () => {
    assert.strictEqual(
      errorFrom(() =>
        SchemaRepresentation.toSchema(
          SchemaRepresentation.fromJson({ representation: { _tag: "Reference", $ref: "Missing" }, references: {} }),
          { revivers: [] }
        )
      ).message,
      `Invalid reference Missing\n  at ["representation"]["$ref"]`
    )

    const invalidPayload = filterJson() as any
    invalidPayload.representation.checks[0].annotations.representation.payload = new Array(1)
    const payloadCodecResult = Schema.decodeUnknownResult(SchemaRepresentation.DocumentFromJson)(
      invalidPayload
    )
    assert.strictEqual(payloadCodecResult._tag, "Failure")
    if (payloadCodecResult._tag === "Failure") {
      assert.strictEqual(
        errorFrom(() =>
          SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(invalidPayload), {
            revivers: [minLengthReviver]
          })
        ).message,
        payloadCodecResult.failure.message
      )
    }

    const invalidDocument: any = {
      representation: { _tag: "String", annotations: { value: new Array(1) }, checks: [] },
      references: {}
    }
    const documentCodecResult = Schema.decodeUnknownResult(SchemaRepresentation.DocumentFromJson)(
      invalidDocument
    )
    assert.strictEqual(documentCodecResult._tag, "Failure")
    if (documentCodecResult._tag === "Failure") {
      assert.strictEqual(
        errorFrom(() => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(invalidDocument), { revivers: [] }))
          .message,
        documentCodecResult.failure.message
      )
    }
  })
})
