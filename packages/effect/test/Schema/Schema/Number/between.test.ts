import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("between", () => {
  const schema = S.Number.pipe(S.between(-1, 1)).annotations({
    title: "[-1, -1] interval"
  })
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      -2,
      `[-1, -1] interval
└─ Predicate refinement failure
   └─ Expected [-1, -1] interval, actual -2`
    )
    await Util.expectDecodeUnknownSuccess(schema, 0, 0)
    await Util.expectDecodeUnknownFailure(
      schema,
      2,
      `[-1, -1] interval
└─ Predicate refinement failure
   └─ Expected [-1, -1] interval, actual 2`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
