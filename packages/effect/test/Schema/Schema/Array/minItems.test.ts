import { describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("minItems", () => {
  it("should throw for invalid argument", () => {
    throws(
      () => S.Array(S.Number).pipe(S.minItems(-1)),
      new Error(`Invalid Argument
details: Expected an integer greater than or equal to 1, actual -1`)
    )
  })

  describe("decoding", () => {
    it("Array", async () => {
      const schema = S.Array(S.Number).pipe(S.minItems(2))

      await Util.assertions.decoding.succeed(schema, [1, 2])
      await Util.assertions.decoding.succeed(schema, [1, 2, 3])
      await Util.assertions.decoding.fail(
        schema,
        [],
        `minItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at least 2 item(s), actual []`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1],
        `minItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at least 2 item(s), actual [1]`
      )
    })

    it("NonEmptyArray", async () => {
      const schema = S.NonEmptyArray(S.Number).pipe(S.minItems(2))

      await Util.assertions.decoding.succeed(schema, [1, 2])
      await Util.assertions.decoding.succeed(schema, [1, 2, 3])
      await Util.assertions.decoding.fail(
        schema,
        [],
        `minItems(2)
└─ From side refinement failure
   └─ readonly [number, ...number[]]
      └─ [0]
         └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1],
        `minItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at least 2 item(s), actual [1]`
      )
    })
  })
})
