import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("maxItems", () => {
  it("should throw for invalid argument", () => {
    expect(() => S.Array(S.Number).pipe(S.maxItems(-1))).toThrowError(
      new Error(`Invalid Argument
details: Expected an integer greater than or equal to 1, actual -1`)
    )
  })

  describe("decoding", () => {
    it("Array", async () => {
      const schema = S.Array(S.Number).pipe(S.maxItems(2))

      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [1, 2])
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, 2, 3],
        `maxItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at most 2 item(s), actual [1,2,3]`
      )
    })

    it("NonEmptyArray", async () => {
      const schema = S.NonEmptyArray(S.Number).pipe(S.maxItems(2))

      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [1, 2])
      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        `maxItems(2)
└─ From side refinement failure
   └─ readonly [number, ...number[]]
      └─ [0]
         └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, 2, 3],
        `maxItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at most 2 item(s), actual [1,2,3]`
      )
    })
  })
})
