import { describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"
import * as AST from "effect/SchemaAST"

describe("AST.IndexSignature", () => {
  it("new IndexSignature should throw on unsupported ASTs", () => {
    throws(
      () => new AST.IndexSignature(AST.booleanKeyword, AST.stringKeyword, true),
      new Error(
        `Unsupported index signature parameter
details: An index signature parameter type must be \`string\`, \`symbol\`, a template literal type or a refinement of the previous types`
      )
    )
  })
})
