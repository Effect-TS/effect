import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Capitalize", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Capitalize
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.Capitalize
    await Util.assertions.decoding.succeed(schema, "aa", "Aa")
    await Util.assertions.decoding.succeed(schema, "aa ", "Aa ")
    await Util.assertions.decoding.succeed(schema, " aa ", " aa ")
    await Util.assertions.decoding.succeed(schema, "", "")
  })

  it("encoding", async () => {
    const schema = S.Capitalize
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "Aa", "Aa")

    await Util.expectEncodeFailure(
      schema,
      "aa",
      `Capitalize
└─ Type side transformation failure
   └─ Capitalized
      └─ Predicate refinement failure
         └─ Expected a capitalized string, actual "aa"`
    )
  })
})
