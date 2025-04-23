import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("UniqueSymbolFromSelf", () => {
  const a = Symbol.for("effect/Schema/test/a")
  const schema = S.UniqueSymbolFromSelf(a)
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, a)
    await Util.assertions.decoding.succeed(schema, Symbol.for("effect/Schema/test/a"))
    await Util.assertions.decoding.fail(
      schema,
      "Symbol(effect/Schema/test/a)",
      `Expected Symbol(effect/Schema/test/a), actual "Symbol(effect/Schema/test/a)"`
    )
  })
})
