import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > NonPositive", () => {
  const schema = S.NonPositive
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0, 0)
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `NonPositive
└─ Predicate refinement failure
   └─ Expected NonPositive (a non-positive number), actual 1`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1, -1)
  })
})
