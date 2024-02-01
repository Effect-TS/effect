import type * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > suspend", () => {
  it("should memoize the AST", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () => S.tuple(S.number, S.union(schema, S.literal(null)))
    )
    const ast = schema.ast as AST.Suspend
    expect(ast.f() === ast.f()).toBe(true)
  })
})
