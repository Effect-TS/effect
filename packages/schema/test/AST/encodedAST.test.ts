import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > encodedAST", () => {
  describe(`should return the same reference if the AST doesn't represent a transformation`, () => {
    it("declaration (true)", () => {
      const schema = S.optionFromSelf(S.string)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("declaration (false)", () => {
      const schema = S.optionFromSelf(S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("tuple (true)", () => {
      const schema = S.tuple(S.string, S.number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("tuple (false)", () => {
      const schema = S.tuple(S.string, S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("array (true)", () => {
      const schema = S.array(S.number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("array (false)", () => {
      const schema = S.array(S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("union (true)", () => {
      const schema = S.union(S.string, S.number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("union (false)", () => {
      const schema = S.union(S.string, S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("struct (true)", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("struct (false)", () => {
      const schema = S.struct({ a: S.string, b: S.NumberFromString })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })

    it("record (true)", () => {
      const schema = S.record(S.string, S.number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("record (false)", () => {
      const schema = S.record(S.string, S.NumberFromString)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(false)
    })
  })
})
