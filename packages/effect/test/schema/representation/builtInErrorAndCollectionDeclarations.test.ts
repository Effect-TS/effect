import { assert, describe, it } from "@effect/vitest"
import { type JsonSchema, Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

const errorJsonSchema: JsonSchema.JsonSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    name: { type: "string" },
    stack: { type: "string" },
    cause: {}
  },
  required: ["message"],
  additionalProperties: false
}

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

describe("SchemaRepresentation built-in Error and collection declarations", () => {
  it("normalizes Error options into the persisted declaration protocol", () => {
    const cases = [
      { schema: Schema.Error(), payload: null, runtime: "Schema.Error()" },
      {
        schema: Schema.Error({ includeStack: false, excludeCause: false }),
        payload: null,
        runtime: "Schema.Error()"
      },
      {
        schema: Schema.Error({ includeStack: true }),
        payload: { includeStack: true },
        runtime: "Schema.Error({\"includeStack\":true})"
      },
      {
        schema: Schema.Error({ excludeCause: true }),
        payload: { excludeCause: true },
        runtime: "Schema.Error({\"excludeCause\":true})"
      },
      {
        schema: Schema.Error({ includeStack: true, excludeCause: true }),
        payload: { includeStack: true, excludeCause: true },
        runtime: "Schema.Error({\"includeStack\":true,\"excludeCause\":true})"
      }
    ] as const

    for (const entry of cases) {
      const annotations = entry.schema.ast.annotations as Schema.Annotations.Declaration<unknown>
      assert.deepStrictEqual(annotations.representation, {
        id: "effect/schema/Error",
        payload: entry.payload
      })
      assert.deepStrictEqual(annotations.toJsonSchema?.({ typeParameters: [], schemas: [] }), errorJsonSchema)
      assert.strictEqual(typeof annotations.toCode, "function")
      if (typeof annotations.toCode === "function") {
        assert.deepStrictEqual(annotations.toCode({ typeParameters: [], schemas: [] }), {
          runtime: entry.runtime,
          Type: "globalThis.Error"
        })
      }
    }
  })

  it("uses ReadonlyMap and ReadonlySet type parameters in both compilers", () => {
    const map = Schema.ReadonlyMap(Schema.String, Schema.Boolean)
    const mapAnnotations = map.ast.annotations as Schema.Annotations.Declaration<unknown>
    assert.deepStrictEqual(mapAnnotations.representation, {
      id: "effect/schema/ReadonlyMap",
      payload: null
    })
    assert.deepStrictEqual(
      mapAnnotations.toJsonSchema?.({
        typeParameters: [{ const: "key" }, { const: "value" }],
        schemas: []
      }),
      {
        type: "array",
        items: {
          type: "array",
          prefixItems: [{ const: "key" }, { const: "value" }],
          minItems: 2,
          maxItems: 2
        }
      }
    )
    assert.strictEqual(typeof mapAnnotations.toCode, "function")
    if (typeof mapAnnotations.toCode === "function") {
      assert.deepStrictEqual(
        mapAnnotations.toCode({
          typeParameters: [
            { runtime: "Key", Type: "K" },
            { runtime: "Value", Type: "V" }
          ],
          schemas: []
        }),
        {
          runtime: "Schema.ReadonlyMap(Key, Value)",
          Type: "globalThis.ReadonlyMap<K, V>"
        }
      )
    }

    const set = Schema.ReadonlySet(Schema.String)
    const setAnnotations = set.ast.annotations as Schema.Annotations.Declaration<unknown>
    assert.deepStrictEqual(setAnnotations.representation, {
      id: "effect/schema/ReadonlySet",
      payload: null
    })
    assert.deepStrictEqual(
      setAnnotations.toJsonSchema?.({ typeParameters: [{ const: "value" }], schemas: [] }),
      { type: "array", items: { const: "value" } }
    )
    assert.strictEqual(typeof setAnnotations.toCode, "function")
    if (typeof setAnnotations.toCode === "function") {
      assert.deepStrictEqual(
        setAnnotations.toCode({
          typeParameters: [{ runtime: "Value", Type: "V" }],
          schemas: []
        }),
        {
          runtime: "Schema.ReadonlySet(Value)",
          Type: "globalThis.ReadonlySet<V>"
        }
      )
    }
  })

  it("revives the declarations with annotations and collection checks", () => {
    const originals = [
      Schema.Error({ includeStack: true, excludeCause: true }).annotate({ description: "error" }),
      Schema.ReadonlyMap(Schema.String, Schema.Boolean).annotate({ description: "map" }),
      Schema.ReadonlySet(Schema.String).annotate({ description: "set" }).check(Schema.isMinSize(1))
    ] as const
    const json = SchemaRepresentation.toJsonMultiDocument(SchemaRepresentation.fromASTs(
      originals.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    ))
    const revived = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: [
        Schema.ErrorReviver,
        Schema.ReadonlyMapReviver,
        Schema.ReadonlySetReviver,
        Schema.isMinSizeReviver
      ]
    })

    const error = noServices(revived.schemas[0])
    assert.isTrue(Schema.decodeUnknownResult(error)(new globalThis.Error("boom"))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(error)({ message: "boom" })._tag === "Failure")

    const map = noServices(revived.schemas[1])
    assert.isTrue(Schema.decodeUnknownResult(map)(new Map([["a", true]]))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(map)(new Map([["a", 1]]))._tag === "Failure")

    const set = noServices(revived.schemas[2])
    assert.isTrue(Schema.decodeUnknownResult(set)(new Set(["a"]))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(set)(new Set<string>())._tag === "Failure")
    assert.isTrue(Schema.decodeUnknownResult(set)(new Set([1]))._tag === "Failure")

    assert.deepStrictEqual(revived.schemas.map((schema) => schema.ast.annotations?.description), [
      "error",
      "map",
      "set"
    ])
    const lowered = SchemaRepresentation.fromASTs(
      revived.schemas.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    assert.deepStrictEqual(SchemaRepresentation.toJsonMultiDocument(lowered), json)
  })

  it("compiles the encoded contracts and composed collection checks", () => {
    const originals = [
      Schema.Error({ includeStack: true, excludeCause: true }),
      Schema.ReadonlyMap(Schema.String, Schema.Boolean),
      Schema.ReadonlySet(Schema.String).check(Schema.isMinSize(1))
    ] as const
    const document = SchemaRepresentation.fromASTs(
      originals.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )

    assert.deepStrictEqual(SchemaRepresentation.toJsonSchemaMultiDocument(document).schemas, [
      errorJsonSchema,
      {
        type: "array",
        items: {
          type: "array",
          prefixItems: [{ type: "string" }, { type: "boolean" }],
          minItems: 2,
          maxItems: 2
        }
      },
      { type: "array", items: { type: "string" } }
    ])
    assert.deepStrictEqual(SchemaRepresentation.toCodeDocument(document).codes, [
      {
        runtime: "Schema.Error({\"includeStack\":true,\"excludeCause\":true}).annotate({ \"expected\": \"Error\" })",
        Type: "globalThis.Error"
      },
      {
        runtime: "Schema.ReadonlyMap(Schema.String, Schema.Boolean).annotate({ \"expected\": \"ReadonlyMap\" })",
        Type: "globalThis.ReadonlyMap<string, boolean>"
      },
      {
        runtime:
          "Schema.ReadonlySet(Schema.String).annotate({ \"expected\": \"ReadonlySet\" }).check(Schema.isMinSize(1).annotate({ \"expected\": \"a value with a size of at least 1\" }))",
        Type: "globalThis.ReadonlySet<string>"
      }
    ])
  })

  it("rejects non-canonical Error payloads and invalid collection arity", () => {
    const payloads = [
      {},
      { includeStack: false },
      { excludeCause: false },
      { includeStack: true, unexpected: true },
      "includeStack"
    ]
    for (const payload of payloads) {
      const json = SchemaRepresentation.toJson(SchemaRepresentation.fromAST(Schema.Error().ast)) as any
      json.representation.annotations.representation.payload = payload
      throws(
        () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(json), { revivers: [Schema.ErrorReviver] }),
        `Invalid representation payload for ${Schema.ErrorReviver.id}\n  at ["representation"]["annotations"]["representation"]["payload"]`
      )
    }

    const mapJson = SchemaRepresentation.toJson(
      SchemaRepresentation.fromAST(Schema.ReadonlyMap(Schema.String, Schema.Boolean).ast)
    ) as any
    mapJson.representation.typeParameters.pop()
    throws(
      () =>
        SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(mapJson), {
          revivers: [Schema.ReadonlyMapReviver]
        }),
      `Invalid type parameters arity for ${Schema.ReadonlyMapReviver.id}: expected ${Schema.ReadonlyMapReviver.typeParametersArity}, got ${mapJson.representation.typeParameters.length}\n  at ["representation"]["typeParameters"]`
    )
  })
})
