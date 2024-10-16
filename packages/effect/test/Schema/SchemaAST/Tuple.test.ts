import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("AST.Tuple", () => {
  it("A required element cannot follow an optional element", () => {
    expect(() =>
      new AST.TupleType(
        [new AST.OptionalType(AST.stringKeyword, true), new AST.OptionalType(AST.stringKeyword, false)],
        [],
        true
      )
    ).toThrow(
      new Error(`Invalid element
details: A required element cannot follow an optional element. ts(1257)`)
    )
  })

  it("A required rest element cannot follow an optional element", () => {
    expect(() =>
      new AST.TupleType(
        [new AST.OptionalType(AST.stringKeyword, true)],
        [new AST.Type(AST.stringKeyword), new AST.Type(AST.stringKeyword)],
        true
      )
    ).toThrow(
      new Error(`Invalid element
details: A required element cannot follow an optional element. ts(1257)`)
    )
  })
})
