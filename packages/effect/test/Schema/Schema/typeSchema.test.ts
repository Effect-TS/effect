import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("typeSchema", () => {
  it("transformation", () => {
    const schema = S.String.pipe(
      S.transform(
        S.Tuple(S.NumberFromString, S.NumberFromString),
        { strict: true, decode: (s) => [s, s] as const, encode: ([s]) => s }
      ),
      S.typeSchema
    )
    deepStrictEqual(S.decodeUnknownSync(schema)([1, 2]), [1, 2])
  })

  it("refinement", () => {
    const schema = S.NumberFromString.pipe(
      S.greaterThanOrEqualTo(1),
      S.lessThanOrEqualTo(2),
      S.typeSchema
    )
    assertFalse(S.is(schema)(0))
    assertTrue(S.is(schema)(1))
    assertTrue(S.is(schema)(2))
    assertFalse(S.is(schema)(3))
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
    await Util.assertions.decoding.fail(schema, null, "Expected number, actual null")
    await Util.assertions.decoding.fail(schema, "a", `Expected number, actual "a"`)
  })
})
