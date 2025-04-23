import { describe, it } from "@effect/vitest"
import { strictEqual, throws } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("AST.Tuple", () => {
  it("toString", () => {
    strictEqual(String(S.Tuple(S.String, S.optionalElement(S.Number))), "readonly [string, number?]")
  })

  it("A required element cannot follow an optional element", () => {
    throws(
      () =>
        new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, true), new AST.OptionalType(AST.stringKeyword, false)],
          [],
          true
        ),
      new Error(`Invalid element
details: A required element cannot follow an optional element. ts(1257)`)
    )
  })

  it("A required rest element cannot follow an optional element", () => {
    throws(
      () =>
        new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, true)],
          [new AST.Type(AST.stringKeyword), new AST.Type(AST.stringKeyword)],
          true
        ),
      new Error(`Invalid element
details: A required element cannot follow an optional element. ts(1257)`)
    )
  })
})
