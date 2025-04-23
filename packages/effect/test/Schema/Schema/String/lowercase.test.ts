import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    await Util.assertions.encoding.succeed(schema, "", "")
    await Util.assertions.encoding.succeed(schema, "a", "a")

    await Util.assertions.encoding.fail(
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
