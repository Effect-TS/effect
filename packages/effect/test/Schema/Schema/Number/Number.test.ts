import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Number", () => {
  const schema = S.Number
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 1, 1)
    await Util.assertions.decoding.succeed(schema, NaN, NaN)
    await Util.assertions.decoding.succeed(schema, Infinity, Infinity)
    await Util.assertions.decoding.succeed(schema, -Infinity, -Infinity)
    await Util.assertions.decoding.fail(schema, "a", `Expected number, actual "a"`)
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1, 1)
  })
})
