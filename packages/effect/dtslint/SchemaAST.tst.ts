import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "tstyche"

describe("SchemaAST", () => {
  it("annotations", () => {
    // should allow to add custom string annotations to a schema
    expect(AST.annotations(AST.stringKeyword, { a: 1 })).type.toBe<AST.AST>()
    // should allow to add custom symbol annotations to a schema
    expect(AST.annotations(AST.stringKeyword, { [Symbol.for("a")]: 1 })).type.toBe<AST.AST>()
  })
})
