import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Boolean", () => {
  const schema = S.Boolean
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, true, true)
    await Util.assertions.decoding.succeed(schema, false, false)
    await Util.assertions.decoding.fail(schema, 1, `Expected boolean, actual 1`)
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, true, true)
    await Util.assertions.encoding.succeed(schema, false, false)
  })
})
