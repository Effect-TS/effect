import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("minItems", () => {
  it("should throw for invalid argument", () => {
    expect(() => S.Array(S.Number).pipe(S.minItems(-1))).toThrowError(
      new Error(`Invalid Argument
details: Expected an integer greater than or equal to 1, actual -1`)
    )
  })

  it("decoding", async () => {
    const schema = S.Array(S.Number).pipe(S.minItems(2))
    await Util.expectDecodeUnknownFailure(
      schema,
      [1],
      `an array of at least 2 items
└─ Predicate refinement failure
   └─ Expected an array of at least 2 items, actual [1]`
    )

    await Util.expectDecodeUnknownSuccess(schema, [1, 2])
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3])
  })
})
