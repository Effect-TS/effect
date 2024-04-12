import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > typeSchema", () => {
  it("transformation", () => {
    const schema = S.String.pipe(
      S.transform(
        S.Tuple(S.NumberFromString, S.NumberFromString),
        { decode: (s) => [s, s] as const, encode: ([s]) => s }
      ),
      S.TypeSchema
    )
    expect(S.decodeUnknownSync(schema)([1, 2])).toEqual([1, 2])
  })

  it("refinement", () => {
    const schema = S.NumberFromString.pipe(
      S.greaterThanOrEqualTo(1),
      S.lessThanOrEqualTo(2),
      S.TypeSchema
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
    const schema: S.Schema<A, I> = S.Suspend( // intended outer suspend
      () =>
        S.Struct({
          prop: S.Union(S.NumberFromString, schema)
        })
    )
    const to = S.TypeSchema(schema)
    await Util.expectDecodeUnknownSuccess(to, { prop: 1 })
    await Util.expectDecodeUnknownSuccess(to, { prop: { prop: 1 } })
  })

  it("decoding", async () => {
    const schema = S.TypeSchema(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(schema, null, "Expected a number, actual null")
    await Util.expectDecodeUnknownFailure(schema, "a", `Expected a number, actual "a"`)
  })
})
