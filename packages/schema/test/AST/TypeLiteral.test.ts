import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST.TypeLiteral", () => {
  it("should throw on onvalid index signature parameters", () => {
    expect(() => new AST.IndexSignature(S.NumberFromString.ast, AST.stringKeyword, true)).toThrow(
      new Error(
        "An index signature parameter type must be `string`, `symbol`, a template literal type or a refinement of the previous types"
      )
    )
  })

  describe("should give precedence to property signatures / index signatures containing less inhabitants", () => {
    it("literal vs string", () => {
      const schema = S.struct({ a: S.string, b: S.literal("b") })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          new AST.PropertySignature("b", new AST.Literal("b"), false, true),
          new AST.PropertySignature("a", AST.stringKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })

    it("undefined vs string", () => {
      const schema = S.struct({ a: S.string, b: S.undefined })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          new AST.PropertySignature("b", AST.undefinedKeyword, false, true),
          new AST.PropertySignature("a", AST.stringKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })

    it("boolean vs string", () => {
      const schema = S.struct({ a: S.string, b: S.boolean })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          new AST.PropertySignature("b", AST.booleanKeyword, false, true),
          new AST.PropertySignature("a", AST.stringKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })

    it("literal vs boolean", () => {
      const schema = S.struct({ a: S.boolean, b: S.literal(null) })
      expect(schema.ast).toEqual({
        _tag: "TypeLiteral",
        propertySignatures: [
          new AST.PropertySignature("b", new AST.Literal(null), false, true),
          new AST.PropertySignature("a", AST.booleanKeyword, false, true)
        ],
        indexSignatures: [],
        annotations: {}
      })
    })
  })
})
