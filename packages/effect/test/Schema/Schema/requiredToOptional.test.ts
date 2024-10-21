import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("requiredToOptional", () => {
  it("two transformation schemas", async () => {
    const ps = S.requiredToOptional(
      S.NumberFromString,
      S.BigIntFromNumber,
      { decode: Option.liftPredicate((n) => n !== 0), encode: Option.getOrElse(() => 0) }
    )
    const schema = S.Struct({ a: ps })
    await Util.expectDecodeUnknownSuccess(schema, { a: "0" }, {})
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1n })

    await Util.expectEncodeSuccess(schema, {}, { a: "0" })
    await Util.expectEncodeSuccess(schema, { a: 1n }, { a: "1" })
  })
})
