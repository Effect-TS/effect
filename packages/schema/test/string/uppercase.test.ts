import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > Uppercase", () => {
  it("property tests", () => {
    const schema = S.Uppercase
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.Uppercase
    await Util.expectParseSuccess(schema, "A", "A")
    await Util.expectParseSuccess(schema, "a ", "A ")
    await Util.expectParseSuccess(schema, " a ", " A ")
  })

  it("encoding", async () => {
    const schema = S.Uppercase
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "A", "A")

    await Util.expectEncodeFailure(
      schema,
      "a",
      `Uppercase
└─ To side transformation failure
   └─ Expected an uppercase string, actual "a"`
    )
  })
})
