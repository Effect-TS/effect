import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

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
    const pretty = Pretty.make(schema)
    strictEqual(pretty(new URL("https://effect.website")), `https://effect.website/`)
  })
})
