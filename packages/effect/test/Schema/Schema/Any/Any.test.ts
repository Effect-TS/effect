import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Any", () => {
  const schema = S.Any

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, undefined)
    await Util.assertions.decoding.succeed(schema, null)
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.succeed(schema, true)
    await Util.assertions.decoding.succeed(schema, [])
    await Util.assertions.decoding.succeed(schema, {})
  })
})
