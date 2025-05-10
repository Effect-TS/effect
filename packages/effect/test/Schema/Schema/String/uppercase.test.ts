import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uppercase", () => {
  it("test roundtrip consistency", () => {
    const schema = S.Uppercase
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    const schema = S.Uppercase
    await Util.assertions.decoding.succeed(schema, "A", "A")
    await Util.assertions.decoding.succeed(schema, "a ", "A ")
    await Util.assertions.decoding.succeed(schema, " a ", " A ")
  })

  it("encoding", async () => {
    const schema = S.Uppercase
    await Util.assertions.encoding.succeed(schema, "", "")
    await Util.assertions.encoding.succeed(schema, "A", "A")

    await Util.assertions.encoding.fail(
      schema,
      "a",
      `Uppercase
└─ Type side transformation failure
   └─ Uppercased
      └─ Predicate refinement failure
         └─ Expected an uppercase string, actual "a"`
    )
  })
})
