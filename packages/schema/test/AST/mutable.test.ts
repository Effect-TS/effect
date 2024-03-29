import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { identity } from "effect"
import { describe, expect, it } from "vitest"

const expectSameReference = (schema: S.Schema.Any) => {
  const mutable = AST.mutable(AST.isSuspend(schema.ast) ? schema.ast.f() : schema.ast)
  const mutable2 = AST.mutable(mutable)
  expect(mutable === mutable2).toBe(true)
}

describe("AST > mutable", () => {
  it("tuple", () => {
    expectSameReference(S.tuple(S.string, S.number))
  })

  it("struct", () => {
    expectSameReference(S.struct({ a: S.string, b: S.number }))
  })

  it("union", () => {
    expectSameReference(S.union(S.string, S.number))
  })

  it("suspend", () => {
    expectSameReference(S.suspend(() => S.struct({ a: S.string, b: S.number })))
  })

  it("refinement", () => {
    expectSameReference(S.array(S.string).pipe(S.maxItems(2)))
  })

  it("transformation", () => {
    expectSameReference(S.transform(S.array(S.string), S.array(S.string), { decode: identity, encode: identity }))
  })
})
