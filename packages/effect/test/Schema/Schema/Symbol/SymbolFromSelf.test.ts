import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("SymbolFromSelf", () => {
  const schema = S.SymbolFromSelf
  it("decoding", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    await Util.assertions.decoding.succeed(schema, a)
    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected symbol, actual null`
    )
  })

  it("encoding", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    await Util.assertions.encoding.succeed(schema, a, a)
  })
})
