import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Uncapitalize", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Uncapitalize
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.Uncapitalize
    await Util.expectDecodeUnknownSuccess(schema, "AA", "aA")
    await Util.expectDecodeUnknownSuccess(schema, "AA ", "aA ")
    await Util.expectDecodeUnknownSuccess(schema, " aa ", " aa ")
    await Util.expectDecodeUnknownSuccess(schema, "", "")
  })

  it("encoding", async () => {
    const schema = S.Uncapitalize
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "aA", "aA")

    await Util.expectEncodeFailure(
      schema,
      "AA",
      `Uncapitalize
└─ Type side transformation failure
   └─ Uncapitalized
      └─ Predicate refinement failure
         └─ Expected a uncapitalized string, actual "AA"`
    )
  })
})
