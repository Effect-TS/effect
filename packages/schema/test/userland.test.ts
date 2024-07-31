/**
 * It contains a collection of user-defined APIs to keep track of what might break in the event of breaking changes.
 */
import { AST, Schema } from "@effect/schema"
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
})
