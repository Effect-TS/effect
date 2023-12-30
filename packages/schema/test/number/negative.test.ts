import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > Negative", () => {
  const schema = S.Negative
  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      0,
      `Negative
└─ Predicate refinement failure
   └─ Expected a negative number, actual 0`
    )
    await Util.expectParseFailure(
      schema,
      1,
      `Negative
└─ Predicate refinement failure
   └─ Expected a negative number, actual 1`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1, -1)
  })
})
