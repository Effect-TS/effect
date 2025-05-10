import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("URLFromSelf", () => {
  const schema = S.URLFromSelf

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.URLFromSelf)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      new URL("https://effect.website"),
      new URL("https://effect.website")
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      new URL("https://effect.website"),
      new URL("https://effect.website")
    )
  })

  it("Pretty", () => {
    Util.assertions.pretty(schema, new URL("https://effect.website"), `https://effect.website/`)
  })
})
