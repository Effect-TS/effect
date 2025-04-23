import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("encodedAST", () => {
  it("refinements", () => {
    const ast = S.String.pipe(S.minLength(2)).ast
    const encodedAST = AST.encodedAST(ast)
    strictEqual(encodedAST, S.String.ast)
  })

  describe(`should return the same reference if the AST doesn't represent a transformation`, () => {
    it("declaration (true)", () => {
      const schema = S.OptionFromSelf(S.String)
      assertTrue(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("declaration (false)", () => {
      const schema = S.OptionFromSelf(S.NumberFromString)
      assertFalse(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("tuple (true)", () => {
      const schema = S.Tuple(S.String, S.Number)
      assertTrue(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("tuple (false)", () => {
      const schema = S.Tuple(S.String, S.NumberFromString)
      assertFalse(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("array (true)", () => {
      const schema = S.Array(S.Number)
      assertTrue(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("array (false)", () => {
      const schema = S.Array(S.NumberFromString)
      assertFalse(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("union (true)", () => {
      const schema = S.Union(S.String, S.Number)
      assertTrue(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("union (false)", () => {
      const schema = S.Union(S.String, S.NumberFromString)
      assertFalse(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("struct (true)", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      assertTrue(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("struct (false)", () => {
      const schema = S.Struct({ a: S.String, b: S.NumberFromString })
      assertFalse(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("record (true)", () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      assertTrue(AST.encodedAST(schema.ast) === schema.ast)
    })

    it("record (false)", () => {
      const schema = S.Record({ key: S.String, value: S.NumberFromString })
      assertFalse(AST.encodedAST(schema.ast) === schema.ast)
    })
  })
})
