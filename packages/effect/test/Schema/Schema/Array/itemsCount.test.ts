import { describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("itemsCount", () => {
  it("should throw for invalid argument", () => {
    throws(
      () => S.Array(S.Number).pipe(S.itemsCount(-1)),
      new Error(`Invalid Argument
details: Expected an integer greater than or equal to 0, actual -1`)
    )
  })

  it("should allow 0 as a valid argument", async () => {
    const schema = S.Array(S.Number).pipe(S.itemsCount(0))
    await Util.assertions.decoding.succeed(schema, [])
    await Util.assertions.decoding.fail(
      schema,
      [1],
      `itemsCount(0)
└─ Predicate refinement failure
   └─ Expected an array of exactly 0 item(s), actual [1]`
    )
  })

  describe("decoding", () => {
    it("Array", async () => {
      const schema = S.Array(S.Number).pipe(S.itemsCount(2))

      await Util.assertions.decoding.succeed(schema, [1, 2])
      await Util.assertions.decoding.fail(
        schema,
        [],
        `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual []`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1],
        `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual [1]`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, 2, 3],
        `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual [1,2,3]`
      )
    })

    it("NonEmptyArray", async () => {
      const schema = S.NonEmptyArray(S.Number).pipe(S.itemsCount(2))

      await Util.assertions.decoding.succeed(schema, [1, 2])
      await Util.assertions.decoding.fail(
        schema,
        [],
        `itemsCount(2)
└─ From side refinement failure
   └─ readonly [number, ...number[]]
      └─ [0]
         └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1],
        `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual [1]`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, 2, 3],
        `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual [1,2,3]`
      )
    })
  })
})
