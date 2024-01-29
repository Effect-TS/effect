import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("symbol > symbolFromSelf", () => {
  const schema = S.symbolFromSelf
  it("decoding", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    await Util.expectDecodeUnknownSuccess(schema, a)
    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected a symbol, actual null`
    )
  })

  it("encoding", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    await Util.expectEncodeSuccess(schema, a, a)
  })
})
