import { identity } from "effect"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

const expectSameReference = (schema: S.Schema.Any) => {
  const mutable = AST.mutable(AST.isSuspend(schema.ast) ? schema.ast.f() : schema.ast)
  const mutable2 = AST.mutable(mutable)
  expect(mutable === mutable2).toBe(true)
}

describe("mutable", () => {
  it("tuple", () => {
    expectSameReference(S.Tuple(S.String, S.Number))
  })

  it("struct", () => {
    expectSameReference(S.Struct({ a: S.String, b: S.Number }))
  })

  it("union", () => {
    expectSameReference(S.Union(S.String, S.Number))
  })

  it("suspend", () => {
    expectSameReference(S.suspend(() => S.Struct({ a: S.String, b: S.Number })))
  })

  it("refinement", () => {
    expectSameReference(S.Array(S.String).pipe(S.maxItems(2)))
  })

  it("transformation", () => {
    expectSameReference(
      S.transform(S.Array(S.String), S.Array(S.String), { strict: true, decode: identity, encode: identity })
    )
  })
})
