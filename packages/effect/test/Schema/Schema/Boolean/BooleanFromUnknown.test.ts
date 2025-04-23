import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    await Util.assertions.encoding.succeed(schema, true, true)
    await Util.assertions.encoding.succeed(schema, false, false)
  })
})
