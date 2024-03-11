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
      S.typeSchema
    )
    expect(S.decodeUnknownSync(schema)([1, 2])).toEqual([1, 2])
  })

  it("refinement", () => {
    const schema = S.NumberFromString.pipe(
      S.greaterThanOrEqualTo(1),
      S.lessThanOrEqualTo(2),
      S.typeSchema
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
    const schema: S.Schema<A, I> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          prop: S.union(S.NumberFromString, schema)
        })
    )
    const to = S.typeSchema(schema)
    await Util.expectDecodeUnknownSuccess(to, { prop: 1 })
    await Util.expectDecodeUnknownSuccess(to, { prop: { prop: 1 } })
  })

  it("decoding", async () => {
    const schema = S.typeSchema(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(schema, null, "Expected a number, actual null")
    await Util.expectDecodeUnknownFailure(schema, "a", `Expected a number, actual "a"`)
  })
})
