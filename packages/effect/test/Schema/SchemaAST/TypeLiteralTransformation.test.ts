import { describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"
import { identity } from "effect/Function"
import * as AST from "effect/SchemaAST"

describe("AST.TypeLiteralTransformation", () => {
  it("Duplicate property signature transformation", () => {
    throws(
      () =>
        new AST.TypeLiteralTransformation([
          new AST.PropertySignatureTransformation("a", "b", identity, identity),
          new AST.PropertySignatureTransformation("a", "c", identity, identity)
        ]),
      new Error(`Duplicate property signature transformation
details: Duplicate key "a"`)
    )
    throws(
      () =>
        new AST.TypeLiteralTransformation([
          new AST.PropertySignatureTransformation("a", "c", identity, identity),
          new AST.PropertySignatureTransformation("b", "c", identity, identity)
        ]),
      new Error(`Duplicate property signature transformation
details: Duplicate key "c"`)
    )
  })
})
