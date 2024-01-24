import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/uniqueSymbol", () => {
  const a = Symbol.for("@effect/schema/test/a")
  const schema = S.uniqueSymbol(a)
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, a)
    await Util.expectDecodeUnknownSuccess(schema, Symbol.for("@effect/schema/test/a"))
    await Util.expectDecodeUnknownFailure(
      schema,
      "Symbol(@effect/schema/test/a)",
      `Expected Symbol(@effect/schema/test/a), actual "Symbol(@effect/schema/test/a)"`
    )
  })
})
