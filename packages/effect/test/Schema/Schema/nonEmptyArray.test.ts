import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { deepStrictEqual, strictEqual } from "effect/test/util"

describe("nonEmptyArray", () => {
  it("annotations()", () => {
    const schema = S.NonEmptyArray(S.String).annotations({ identifier: "X" }).annotations({ title: "Y" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the value", () => {
    const schema = S.NonEmptyArray(S.String)
    strictEqual(schema.value, S.String)
  })
})
