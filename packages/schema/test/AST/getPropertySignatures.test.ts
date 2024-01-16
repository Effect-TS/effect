import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > getPropertySignatures", () => {
  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature("a", S.string.ast, false, true),
      AST.createPropertySignature("b", S.number.ast, false, true)
    ])
  })

  it("union", () => {
    const schema = S.union(S.struct({ _tag: S.literal("A") }), S.struct({ _tag: S.literal("B") }))
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature("_tag", S.literal("A", "B").ast, false, true)
    ])
  })
})
