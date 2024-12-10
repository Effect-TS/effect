import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("maxItems", () => {
  const schema = S.Array(S.Number).pipe(S.maxItems(2))
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, 2, 3],
      `an array of at most 2 item(s)
└─ Predicate refinement failure
   └─ Expected an array of at most 2 item(s), actual [1,2,3]`
    )

    await Util.expectDecodeUnknownSuccess(schema, [1])
    await Util.expectDecodeUnknownSuccess(schema, [1, 2])
  })
})
