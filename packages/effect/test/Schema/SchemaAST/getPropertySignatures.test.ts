import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("getPropertySignatures", () => {
  it("struct", () => {
    const schema = S.Struct({ a: S.String, b: S.Number })
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })

  it("union", () => {
    const schema = S.Union(S.Struct({ _tag: S.Literal("A") }), S.Struct({ _tag: S.Literal("B") }))
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      new AST.PropertySignature("_tag", S.Literal("A", "B").ast, false, true)
    ])
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.Number }) {}
    const schema = A.pipe(S.typeSchema)
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })
})
