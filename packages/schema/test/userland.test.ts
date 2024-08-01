/**
 * It contains a collection of user-defined APIs to keep track of what might break in the event of breaking changes.
 */
import { AST, Schema } from "@effect/schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Record } from "effect"
import { describe, expect, it } from "vitest"

const structTypeSchema = <Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>
): Schema.Struct<{ [K in keyof Fields]: Schema.Schema<Schema.Schema.Type<Fields[K]>> }> =>
  Schema.Struct(Record.map(schema.fields, (field) => {
    switch (field.ast._tag) {
      case "PropertySignatureDeclaration":
        return Schema.make(AST.typeAST(field.ast.type))
      case "PropertySignatureTransformation":
        return Schema.make(AST.typeAST(field.ast.to.type))
      default:
        return Schema.make(AST.typeAST(field.ast))
    }
  })) as any

describe("userland", () => {
  it("structTypeSchema", () => {
    // Discord: https://discordapp.com/channels/795981131316985866/847382157861060618/1266533881788502096
    // goal: `Schema.typeSchema` for structs, retaining the type

    //      v-- this must be a struct
    const schema = structTypeSchema(Schema.Struct({
      a: Schema.NumberFromString,
      b: Schema.propertySignature(Schema.NumberFromString),
      c: Schema.optionalWith(Schema.NumberFromString, { as: "Option" })
    }))
    expect(schema.fields.a.ast).toStrictEqual(Schema.Number.ast)
    expect(schema.fields.b.ast).toStrictEqual(Schema.Number.ast)
    const c = schema.fields.c.ast
    expect(c._tag).toStrictEqual("Declaration")
    expect((c as AST.Declaration).typeParameters).toStrictEqual([Schema.Number.ast])
  })

  it("detect that a struct does not contain a specific field", async () => {
    // Discord: https://discordapp.com/channels/795981131316985866/847382157861060618/1268175268019830906
    class A extends Schema.Class<A>("A")(
      Schema.Struct({
        a: Schema.String,
        b: Schema.propertySignature(
          Schema.Array(Schema.Struct({
            d: Schema.String
          })).annotations({ parseOptions: { onExcessProperty: "ignore" } })
        ).pipe(Schema.fromKey("c"))
      }).annotations({
        parseOptions: { onExcessProperty: "error" }
      })
    ) {
      readonly _tag = "A"
    }
    await Util.expectDecodeUnknownSuccess(A, { a: "a", c: [{ d: "d" }] }, new A({ a: "a", b: [{ d: "d" }] }))
    await Util.expectDecodeUnknownSuccess(
      A,
      { a: "a", c: [{ d: "d", ignored: null }] },
      new A({ a: "a", b: [{ d: "d" }] })
    )
    await Util.expectDecodeUnknownFailure(
      A,
      { a: "a", c: [{ d: "d" }], not_allowed: null },
      `(A (Encoded side) <-> A)
└─ Encoded side transformation failure
   └─ A (Encoded side)
      └─ Encoded side transformation failure
         └─ Struct (Encoded side)
            └─ ["not_allowed"]
               └─ is unexpected, expected: "a" | "c"`
    )
  })
})
