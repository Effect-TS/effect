import { assert, describe, it } from "@effect/vitest"
import { Cause, Exit, type JsonSchema, Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { throws } from "../../utils/assert.ts"

const numberJsonSchema: JsonSchema.JsonSchema = {
  anyOf: [
    { type: "number" },
    { type: "string", enum: ["NaN"] },
    { type: "string", enum: ["Infinity"] },
    { type: "string", enum: ["-Infinity"] }
  ]
}

function causeReasonJsonSchema(
  error: JsonSchema.JsonSchema,
  defect: JsonSchema.JsonSchema
): JsonSchema.JsonSchema {
  return {
    anyOf: [
      {
        type: "object",
        properties: {
          _tag: { type: "string", enum: ["Fail"] },
          error
        },
        required: ["_tag", "error"],
        additionalProperties: false
      },
      {
        type: "object",
        properties: {
          _tag: { type: "string", enum: ["Die"] },
          defect
        },
        required: ["_tag", "defect"],
        additionalProperties: false
      },
      {
        type: "object",
        properties: {
          _tag: { type: "string", enum: ["Interrupt"] },
          fiberId: {
            anyOf: [
              { type: "number" },
              { type: "null" }
            ]
          }
        },
        required: ["_tag", "fiberId"],
        additionalProperties: false
      }
    ]
  }
}

function causeJsonSchema(
  error: JsonSchema.JsonSchema,
  defect: JsonSchema.JsonSchema
): JsonSchema.JsonSchema {
  return {
    type: "array",
    items: causeReasonJsonSchema(error, defect)
  }
}

function exitJsonSchema(
  value: JsonSchema.JsonSchema,
  error: JsonSchema.JsonSchema,
  defect: JsonSchema.JsonSchema
): JsonSchema.JsonSchema {
  return {
    anyOf: [
      {
        type: "object",
        properties: {
          _tag: { type: "string", enum: ["Success"] },
          value
        },
        required: ["_tag", "value"],
        additionalProperties: false
      },
      {
        type: "object",
        properties: {
          _tag: { type: "string", enum: ["Failure"] },
          cause: causeJsonSchema(error, defect)
        },
        required: ["_tag", "cause"],
        additionalProperties: false
      }
    ]
  }
}

function noServices(schema: Schema.Top): Schema.Codec<unknown> {
  return schema as Schema.Codec<unknown>
}

describe("SchemaRepresentation built-in Cause and Exit declarations", () => {
  it("uses every type parameter in both compilers", () => {
    const cases = [
      {
        schema: Schema.CauseReason(Schema.String, Schema.Number),
        id: "effect/schema/CauseReason",
        jsonTypeParameters: [{ const: "error" }, { const: "defect" }],
        jsonSchema: causeReasonJsonSchema({ const: "error" }, { const: "defect" }),
        codeTypeParameters: [{ runtime: "Error", Type: "E" }, { runtime: "Defect", Type: "D" }],
        generation: {
          runtime: "Schema.CauseReason(Error, Defect)",
          Type: "Cause.Failure<E, D>",
          importDeclarations: [`import * as Cause from "effect/Cause"`]
        }
      },
      {
        schema: Schema.Cause(Schema.String, Schema.Number),
        id: "effect/schema/Cause",
        jsonTypeParameters: [{ const: "error" }, { const: "defect" }],
        jsonSchema: causeJsonSchema({ const: "error" }, { const: "defect" }),
        codeTypeParameters: [{ runtime: "Error", Type: "E" }, { runtime: "Defect", Type: "D" }],
        generation: {
          runtime: "Schema.Cause(Error, Defect)",
          Type: "Cause.Cause<E, D>",
          importDeclarations: [`import * as Cause from "effect/Cause"`]
        }
      },
      {
        schema: Schema.Exit(Schema.String, Schema.Number, Schema.Boolean),
        id: "effect/schema/Exit",
        jsonTypeParameters: [{ const: "value" }, { const: "error" }, { const: "defect" }],
        jsonSchema: exitJsonSchema({ const: "value" }, { const: "error" }, { const: "defect" }),
        codeTypeParameters: [
          { runtime: "Value", Type: "A" },
          { runtime: "Error", Type: "E" },
          { runtime: "Defect", Type: "D" }
        ],
        generation: {
          runtime: "Schema.Exit(Value, Error, Defect)",
          Type: "Exit.Exit<A, E, D>",
          importDeclarations: [`import * as Exit from "effect/Exit"`]
        }
      }
    ] as const

    for (const entry of cases) {
      const annotations = entry.schema.ast.annotations as Schema.Annotations.Declaration<unknown>
      assert.deepStrictEqual(annotations.representation, {
        id: entry.id,
        payload: null
      })
      assert.deepStrictEqual(
        annotations.toJsonSchema?.({ typeParameters: entry.jsonTypeParameters, schemas: [] }),
        entry.jsonSchema
      )
      assert.strictEqual(typeof annotations.toCode, "function")
      if (typeof annotations.toCode === "function") {
        assert.deepStrictEqual(
          annotations.toCode({ typeParameters: entry.codeTypeParameters, schemas: [] }),
          entry.generation
        )
      }
    }
  })

  it("persists Exit as a compact declaration instead of duplicating its encoded tree", () => {
    const persisted = Schema.decodeUnknownSync(SchemaRepresentation.DocumentFromJson)(
      SchemaRepresentation.toJson(
        SchemaRepresentation.fromAST(Schema.Exit(Schema.String, Schema.Number, Schema.Boolean).ast)
      )
    )

    assert.strictEqual(persisted.representation._tag, "Declaration")
    if (persisted.representation._tag === "Declaration") {
      assert.deepStrictEqual(persisted.representation.typeParameters.map(({ _tag }) => _tag), [
        "String",
        "Number",
        "Boolean"
      ])
      assert.isFalse("encodedSchema" in persisted.representation)
      assert.deepStrictEqual(persisted.representation.annotations?.representation, {
        id: "effect/schema/Exit",
        payload: null
      })
    }
    assert.deepStrictEqual(persisted.references, {})
  })

  it("revives CauseReason, Cause and Exit semantics without a global registry", () => {
    const originals = [
      Schema.CauseReason(Schema.String, Schema.Boolean).annotate({ description: "reason" }),
      Schema.Cause(Schema.String, Schema.Boolean).annotate({ description: "cause" }),
      Schema.Exit(Schema.String, Schema.Number, Schema.Boolean).annotate({ description: "exit" })
    ] as const
    const json = SchemaRepresentation.toJsonMultiDocument(SchemaRepresentation.fromASTs(
      originals.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    ))
    const revived = SchemaRepresentation.toSchemaMultiDocument(SchemaRepresentation.fromJsonMultiDocument(json), {
      revivers: [Schema.CauseReasonReviver, Schema.CauseReviver, Schema.ExitReviver]
    })

    const reason = noServices(revived.schemas[0])
    assert.isTrue(Schema.decodeUnknownResult(reason)(Cause.fail("boom").reasons[0])._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(reason)(Cause.die(true).reasons[0])._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(reason)(Cause.interrupt(1).reasons[0])._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(reason)(Cause.fail(1).reasons[0])._tag === "Failure")
    assert.isTrue(Schema.decodeUnknownResult(reason)(Cause.die("boom").reasons[0])._tag === "Failure")

    const cause = noServices(revived.schemas[1])
    assert.isTrue(Schema.decodeUnknownResult(cause)(Cause.fail("boom"))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(cause)(Cause.die(true))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(cause)(Cause.interrupt(1))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(cause)(Cause.fail(1))._tag === "Failure")
    assert.isTrue(Schema.decodeUnknownResult(cause)(Cause.die("boom"))._tag === "Failure")

    const exit = noServices(revived.schemas[2])
    assert.isTrue(Schema.decodeUnknownResult(exit)(Exit.succeed("ok"))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(exit)(Exit.fail(1))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(exit)(Exit.die(true))._tag === "Success")
    assert.isTrue(Schema.decodeUnknownResult(exit)(Exit.succeed(1))._tag === "Failure")
    assert.isTrue(Schema.decodeUnknownResult(exit)(Exit.fail("boom"))._tag === "Failure")
    assert.isTrue(Schema.decodeUnknownResult(exit)(Exit.die("boom"))._tag === "Failure")

    assert.deepStrictEqual(revived.schemas.map((schema) => schema.ast.annotations?.description), [
      "reason",
      "cause",
      "exit"
    ])
    const lowered = SchemaRepresentation.fromASTs(
      revived.schemas.map((schema) => schema.ast) as [SchemaAST.AST, ...Array<SchemaAST.AST>]
    )
    assert.deepStrictEqual(SchemaRepresentation.toJsonMultiDocument(lowered), json)
  })

  it("compiles the nested encoded contracts", () => {
    const document = SchemaRepresentation.fromASTs([
      Schema.CauseReason(Schema.String, Schema.Number).ast,
      Schema.Cause(Schema.String, Schema.Number).ast,
      Schema.Exit(Schema.String, Schema.Number, Schema.Boolean).ast
    ])

    assert.deepStrictEqual(SchemaRepresentation.toJsonSchemaMultiDocument(document).schemas, [
      causeReasonJsonSchema({ type: "string" }, numberJsonSchema),
      causeJsonSchema({ type: "string" }, numberJsonSchema),
      exitJsonSchema({ type: "string" }, numberJsonSchema, { type: "boolean" })
    ])
    const code = SchemaRepresentation.toCodeDocument(document)
    assert.deepStrictEqual(code.codes, [
      {
        runtime: "Schema.CauseReason(Schema.String, Schema.Number).annotate({ \"expected\": \"Cause.Failure\" })",
        Type: "Cause.Failure<string, number>"
      },
      {
        runtime: "Schema.Cause(Schema.String, Schema.Number).annotate({ \"expected\": \"Cause\" })",
        Type: "Cause.Cause<string, number>"
      },
      {
        runtime: "Schema.Exit(Schema.String, Schema.Number, Schema.Boolean).annotate({ \"expected\": \"Exit\" })",
        Type: "Exit.Exit<string, number, boolean>"
      }
    ])
    assert.deepStrictEqual(code.artifacts, [
      { _tag: "Import", importDeclaration: `import * as Cause from "effect/Cause"` },
      { _tag: "Import", importDeclaration: `import * as Exit from "effect/Exit"` }
    ])
  })

  it("rejects non-null payloads and invalid type-parameter arities", () => {
    const declarations = [
      { schema: Schema.CauseReason(Schema.String, Schema.Boolean), reviver: Schema.CauseReasonReviver },
      { schema: Schema.Cause(Schema.String, Schema.Boolean), reviver: Schema.CauseReviver },
      { schema: Schema.Exit(Schema.String, Schema.Number, Schema.Boolean), reviver: Schema.ExitReviver }
    ] as const

    for (const entry of declarations) {
      const invalidPayload = SchemaRepresentation.toJson(
        SchemaRepresentation.fromAST(entry.schema.ast)
      ) as any
      invalidPayload.representation.annotations.representation.payload = {}
      throws(
        () =>
          SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(invalidPayload), { revivers: [entry.reviver] }),
        `Invalid representation payload for ${entry.reviver.id}\n  at ["representation"]["annotations"]["representation"]["payload"]`
      )

      const invalidArity = SchemaRepresentation.toJson(
        SchemaRepresentation.fromAST(entry.schema.ast)
      ) as any
      invalidArity.representation.typeParameters.pop()
      throws(
        () => SchemaRepresentation.toSchema(SchemaRepresentation.fromJson(invalidArity), { revivers: [entry.reviver] }),
        `Invalid type parameters arity for ${entry.reviver.id}: expected ${entry.reviver.typeParametersArity}, got ${invalidArity.representation.typeParameters.length}\n  at ["representation"]["typeParameters"]`
      )
    }
  })
})
