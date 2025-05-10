import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Not", () => {
  const schema = S.Not
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, true, false)
    await Util.assertions.decoding.succeed(schema, false, true)
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, true, false)
    await Util.assertions.encoding.succeed(schema, false, true)
  })
})
