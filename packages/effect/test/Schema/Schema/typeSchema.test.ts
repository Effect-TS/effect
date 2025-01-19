import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("typeSchema", () => {
  it("transformation", () => {
    const schema = S.String.pipe(
      S.transform(
        S.Tuple(S.NumberFromString, S.NumberFromString),
        { strict: true, decode: (s) => [s, s] as const, encode: ([s]) => s }
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
        S.Struct({
          prop: S.Union(S.NumberFromString, schema)
        })
    )
    const to = S.typeSchema(schema)
    await Util.assertions.decoding.succeed(to, { prop: 1 })
    await Util.assertions.decoding.succeed(to, { prop: { prop: 1 } })
  })

  it("decoding", async () => {
    const schema = S.typeSchema(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.expectDecodeUnknownFailure(schema, null, "Expected number, actual null")
    await Util.expectDecodeUnknownFailure(schema, "a", `Expected number, actual "a"`)
  })
})
