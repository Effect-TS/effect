import type * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("AST.Suspend", () => {
  it("should memoize the thunk", async () => {
    let log = 0
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.Struct({
      a: S.String,
      as: S.Array(S.suspend(() => {
        log++
        return schema
      }))
    })
    await Util.expectDecodeUnknownSuccess(schema, { a: "a1", as: [] })
    await Util.expectDecodeUnknownSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })
    expect(log).toEqual(1)
  })

  it("should memoize the AST", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
    )
    const ast = schema.ast as AST.Suspend
    expect(ast.f() === ast.f()).toBe(true)
  })
})
