import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("String", () => {
  const schema = S.String
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "a", "a")
    await Util.assertions.decoding.fail(schema, 1, "Expected string, actual 1")
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, "a", "a")
  })
})
