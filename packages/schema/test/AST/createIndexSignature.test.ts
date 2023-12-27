import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST/createIndexSignature", () => {
  it("createIndexSignature/ should throw on unsupported ASTs", () => {
    expect(() => AST.createIndexSignature(AST.booleanKeyword, AST.stringKeyword, true))
      .toThrow(
        new Error(
          `An index signature parameter type must be 'string', 'symbol', a template literal type or a refinement of the previous types`
        )
      )
  })
})
