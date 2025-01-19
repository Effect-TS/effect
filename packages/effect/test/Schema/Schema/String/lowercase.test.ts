import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Lowercase", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Lowercase
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.Lowercase
    await Util.assertions.decoding.succeed(schema, "a", "a")
    await Util.assertions.decoding.succeed(schema, "A ", "a ")
    await Util.assertions.decoding.succeed(schema, " A ", " a ")
  })

  it("encoding", async () => {
    const schema = S.Lowercase
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeSuccess(schema, "a", "a")

    await Util.expectEncodeFailure(
      schema,
      "A",
      `Lowercase
└─ Type side transformation failure
   └─ Lowercased
      └─ Predicate refinement failure
         └─ Expected a lowercase string, actual "A"`
    )
  })
})
