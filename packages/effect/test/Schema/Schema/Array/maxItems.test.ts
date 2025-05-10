import { describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("maxItems", () => {
  it("should throw for invalid argument", () => {
    throws(
      () => S.Array(S.Number).pipe(S.maxItems(-1)),
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
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
        schema,
        [],
        `maxItems(2)
└─ From side refinement failure
   └─ readonly [number, ...number[]]
      └─ [0]
         └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, 2, 3],
        `maxItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at most 2 item(s), actual [1,2,3]`
      )
    })
  })
})
