import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    await Util.assertions.encoding.succeed(schema, "", "")
    await Util.assertions.encoding.succeed(schema, "Aa", "Aa")

    await Util.assertions.encoding.fail(
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
