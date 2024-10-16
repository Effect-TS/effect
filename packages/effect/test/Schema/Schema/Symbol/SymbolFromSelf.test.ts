import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("SymbolFromSelf", () => {
  const schema = S.SymbolFromSelf
  it("decoding", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    await Util.expectDecodeUnknownSuccess(schema, a)
    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected symbol, actual null`
    )
  })

  it("encoding", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    await Util.expectEncodeSuccess(schema, a, a)
  })
})
