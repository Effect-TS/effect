import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as FiberId from "effect/FiberId"
import { describe, it } from "vitest"

describe("FiberId", () => {
  it("property tests", () => {
    Util.roundtrip(S.FiberId)
  })

  it("decoding", async () => {
    const schema = S.FiberId

    await Util.expectParseSuccess(schema, { _tag: "None" }, FiberId.none)
    await Util.expectParseSuccess(
      schema,
      { _tag: "Runtime", id: 1, startTimeMillis: 100 },
      FiberId.runtime(1, 100)
    )
    await Util.expectParseSuccess(
      schema,
      { _tag: "Composite", left: { _tag: "None" }, right: { _tag: "None" } },
      FiberId.composite(FiberId.none, FiberId.none)
    )

    await Util.expectParseFailure(
      schema,
      { _tag: "Composite", left: { _tag: "None" }, right: { _tag: "-" } },
      `union member: /right /_tag Expected "Composite" or "Runtime" or "None", actual "-"`
    )
  })
})
