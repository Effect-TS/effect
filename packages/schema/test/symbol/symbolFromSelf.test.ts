import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("symbol/symbolFromSelf", () => {
  const schema = S.symbolFromSelf
  it("decoding", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    await Util.expectParseSuccess(schema, a)
    await Util.expectParseFailure(
      schema,
      "@effect/schema/test/a",
      `Expected symbol, actual "@effect/schema/test/a"`
    )
  })

  it("encoding", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    await Util.expectEncodeSuccess(schema, a, a)
  })
})
