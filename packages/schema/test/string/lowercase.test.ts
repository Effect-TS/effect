import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > Lowercase", () => {
  it("property tests", () => {
    const schema = S.Lowercase
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.Lowercase
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseSuccess(schema, "A ", "a ")
    await Util.expectParseSuccess(schema, " A ", " a ")
  })

  it("encoding", async () => {
    const schema = S.Lowercase
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "a", "a")

    await Util.expectEncodeFailure(
      schema,
      "A",
      `Lowercase
└─ To side transformation failure
   └─ Expected a lowercase string, actual "A"`
    )
  })
})
