import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema/to", () => {
  it("transform", () => {
    const schema = S.string.pipe(
      S.transform(
        S.tuple(S.NumberFromString, S.NumberFromString),
        (s) => [s, s] as const,
        ([s]) => s
      ),
      S.to
    )
    expect(S.parseSync(schema)([1, 2])).toEqual([1, 2])
  })

  it("refinement", () => {
    const schema = S.NumberFromString.pipe(
      S.greaterThanOrEqualTo(1),
      S.lessThanOrEqualTo(2),
      S.to
    )
    expect(S.is(schema)(0)).toEqual(false)
    expect(S.is(schema)(1)).toEqual(true)
    expect(S.is(schema)(2)).toEqual(true)
    expect(S.is(schema)(3)).toEqual(false)
  })

  it("suspend", async () => {
    interface I {
      prop: I | string
    }
    interface A {
      prop: A | number
    }
    const schema: S.Schema<I, A> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          prop: S.union(S.NumberFromString, schema)
        })
    )
    const to = S.to(schema)
    await Util.expectParseSuccess(to, { prop: 1 })
    await Util.expectParseSuccess(to, { prop: { prop: 1 } })
  })

  it("decoding", async () => {
    const schema = S.to(S.NumberFromString)
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(schema, null, "Expected number, actual null")
    await Util.expectParseFailure(schema, "a", `Expected number, actual "a"`)
  })
})
