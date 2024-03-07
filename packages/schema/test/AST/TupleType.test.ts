import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST.TupleType", () => {
  it("A required element cannot follow an optional element", () => {
    expect(() =>
      new AST.TupleType(
        [new AST.Element(AST.stringKeyword, true)],
        [AST.stringKeyword, AST.stringKeyword],
        true
      )
    ).toThrow(
      new Error("A required element cannot follow an optional element. ts(1257)")
    )
  })
})
