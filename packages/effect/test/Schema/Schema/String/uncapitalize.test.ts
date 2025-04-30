import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uncapitalize", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Uncapitalize
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.Uncapitalize
    await Util.assertions.decoding.succeed(schema, "AA", "aA")
    await Util.assertions.decoding.succeed(schema, "AA ", "aA ")
    await Util.assertions.decoding.succeed(schema, " aa ", " aa ")
    await Util.assertions.decoding.succeed(schema, "", "")
  })

  it("encoding", async () => {
    const schema = S.Uncapitalize
    await Util.assertions.encoding.succeed(schema, "", "")
    await Util.assertions.encoding.succeed(schema, "aA", "aA")

    await Util.assertions.encoding.fail(
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
