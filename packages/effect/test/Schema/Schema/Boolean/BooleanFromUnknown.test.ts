import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BooleanFromUnknown", () => {
  const schema = S.BooleanFromUnknown
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, true, true)
    await Util.assertions.decoding.succeed(schema, 1, true)
    await Util.assertions.decoding.succeed(schema, 1n, true)
    await Util.assertions.decoding.succeed(schema, "a", true)

    await Util.assertions.decoding.succeed(schema, false, false)
    await Util.assertions.decoding.succeed(schema, 0, false)
    await Util.assertions.decoding.succeed(schema, 0n, false)
    await Util.assertions.decoding.succeed(schema, null, false)
    await Util.assertions.decoding.succeed(schema, "", false)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, true, true)
    await Util.expectEncodeSuccess(schema, false, false)
  })
})
