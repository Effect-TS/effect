import * as AST from "@effect/schema/AST"

describe.concurrent("AST/createIndexSignature", () => {
  it("createIndexSignature/ should throw on unsupported ASTs", () => {
    expect(() => AST.createIndexSignature(AST.booleanKeyword, AST.stringKeyword, true))
      .toThrowError(
        new Error(
          `An index signature parameter type must be 'string', 'symbol', a template literal type or a refinement of the previous types`
        )
      )
  })
})
