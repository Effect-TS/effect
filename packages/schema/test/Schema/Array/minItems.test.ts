import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("minItems", () => {
  const schema = S.Array(S.Number).pipe(S.minItems(2))
  it("decoding", async () => {
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
