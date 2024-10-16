import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("encodedAST", () => {
  it("refinements", () => {
    const ast = S.String.pipe(S.minLength(2)).ast
    const encodedAST = AST.encodedAST(ast)
    expect(encodedAST).toBe(S.String.ast)
  })

  describe(`should return the same reference if the AST doesn't represent a transformation`, () => {
    it("declaration (true)", () => {
      const schema = S.OptionFromSelf(S.String)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("declaration (false)", () => {
      const schema = S.OptionFromSelf(S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("tuple (true)", () => {
      const schema = S.Tuple(S.String, S.Number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("tuple (false)", () => {
      const schema = S.Tuple(S.String, S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("array (true)", () => {
      const schema = S.Array(S.Number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("array (false)", () => {
      const schema = S.Array(S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("union (true)", () => {
      const schema = S.Union(S.String, S.Number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("union (false)", () => {
      const schema = S.Union(S.String, S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("struct (true)", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("struct (false)", () => {
      const schema = S.Struct({ a: S.String, b: S.NumberFromString })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("record (true)", () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("record (false)", () => {
      const schema = S.Record({ key: S.String, value: S.NumberFromString })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })
  })
})
