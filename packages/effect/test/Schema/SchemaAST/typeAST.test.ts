import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("typeAST", () => {
  describe(`should return the same reference if the AST doesn't represent a transformation`, () => {
    it("declaration (true)", () => {
      const schema = S.OptionFromSelf(S.String)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("declaration (false)", () => {
      const schema = S.OptionFromSelf(S.NumberFromString)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })

    it("tuple (true)", () => {
      const schema = S.Tuple(S.String, S.Number)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("tuple (false)", () => {
      const schema = S.Tuple(S.String, S.NumberFromString)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })

    it("array (true)", () => {
      const schema = S.Array(S.Number)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("array (false)", () => {
      const schema = S.Array(S.NumberFromString)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })

    it("union (true)", () => {
      const schema = S.Union(S.String, S.Number)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("union (false)", () => {
      const schema = S.Union(S.String, S.NumberFromString)
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })

    it("struct (true)", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("struct (false)", () => {
      const schema = S.Struct({ a: S.String, b: S.NumberFromString })
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })

    it("record (true)", () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("record (false)", () => {
      const schema = S.Record({ key: S.String, value: S.NumberFromString })
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })

    it("refinement (true)", () => {
      const schema = S.Number.pipe(S.filter((n) => n > 0))
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(true)
    })

    it("refinement (false)", () => {
      const schema = S.NumberFromString.pipe(S.filter((n) => n > 0))
      expect(AST.typeAST(schema.ast) === schema.ast).toBe(false)
    })
  })
})
