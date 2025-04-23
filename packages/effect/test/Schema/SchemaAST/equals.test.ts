import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("equals", () => {
  describe("TemplateLiteral", () => {
    it(`("a" | "b") + string + ("d" | "e")`, () => {
      const schema1 = S.TemplateLiteral(S.Literal("a", "b"), S.String, S.Literal("d", "e"))
      const schema2 = S.TemplateLiteral(S.Literal("a", "b"), S.String, S.Literal("d", "f"))
      assertTrue(AST.equals(schema1.ast, schema1.ast))
      assertFalse(AST.equals(schema1.ast, schema2.ast))
    })
  })
})
