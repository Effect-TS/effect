import { identity } from "effect/Function"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("AST.TypeLiteralTransformation", () => {
  it("Duplicate property signature transformation", () => {
    expect(() =>
      new AST.TypeLiteralTransformation([
        new AST.PropertySignatureTransformation("a", "b", identity, identity),
        new AST.PropertySignatureTransformation("a", "c", identity, identity)
      ])
    ).toThrow(
      new Error(`Duplicate property signature transformation
details: Duplicate key "a"`)
    )
    expect(() =>
      new AST.TypeLiteralTransformation([
        new AST.PropertySignatureTransformation("a", "c", identity, identity),
        new AST.PropertySignatureTransformation("b", "c", identity, identity)
      ])
    ).toThrow(
      new Error(`Duplicate property signature transformation
details: Duplicate key "c"`)
    )
  })
})
