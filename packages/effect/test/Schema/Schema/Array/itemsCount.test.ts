import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("itemsCount", () => {
  const schema = S.Array(S.Number).pipe(S.itemsCount(2))
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      [],
      `an array of exactly 2 item(s)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual []`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1],
      `an array of exactly 2 item(s)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual [1]`
    )
    await Util.expectDecodeUnknownSuccess(schema, [1, 2])
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, 2, 3],
      `an array of exactly 2 item(s)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual [1,2,3]`
    )
  })
})
