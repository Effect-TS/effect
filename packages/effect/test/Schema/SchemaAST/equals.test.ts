import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("equals", () => {
  describe("TemplateLiteral", () => {
    it(`("a" | "b") + string + ("d" | "e")`, () => {
      const schema1 = S.TemplateLiteral(S.Literal("a", "b"), S.String, S.Literal("d", "e"))
      const schema2 = S.TemplateLiteral(S.Literal("a", "b"), S.String, S.Literal("d", "f"))
      expect(AST.equals(schema1.ast, schema1.ast)).toBe(true)
      expect(AST.equals(schema1.ast, schema2.ast)).toBe(false)
    })
  })
})
