import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Never", () => {
  const schema = S.Never
  it("decoding", async () => {
    await Util.assertions.decoding.fail(schema, 1, "Expected never, actual 1")
  })

  it("encoding", async () => {
    await Util.assertions.encoding.fail(schema, 1 as any as never, "Expected never, actual 1")
  })
})
