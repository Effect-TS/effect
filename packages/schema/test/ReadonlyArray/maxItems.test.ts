import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlyArray > maxItems", () => {
  const schema = S.Array(S.Number).pipe(S.maxItems(2))
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, 2, 3],
      `an array of at most 2 items
└─ Predicate refinement failure
   └─ Expected an array of at most 2 items, actual [1,2,3]`
    )

    await Util.expectDecodeUnknownSuccess(schema, [1])
    await Util.expectDecodeUnknownSuccess(schema, [1, 2])
  })
})
