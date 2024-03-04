import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > encodedAST", () => {
  describe(`should return the same reference if the AST doesn't represent a transformation`, () => {
    it("declaration", () => {
      const schema = S.optionFromSelf(S.string)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("tuple + r", () => {
      const schema = S.nonEmptyArray(S.string)
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      expect(AST.encodedAST(schema.ast) === schema.ast).toBe(true)
    })
  })
})
