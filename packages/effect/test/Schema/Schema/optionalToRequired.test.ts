import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("optionalToRequired", () => {
  it("two transformation schemas", async () => {
    const ps = S.optionalToRequired(
      S.NumberFromString,
      S.BigIntFromNumber,
      { decode: Option.getOrElse(() => 0), encode: Option.liftPredicate((n) => n !== 0) }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.decoding.succeed(schema, {}, { a: 0n })
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1n })

    await Util.expectEncodeSuccess(schema, { a: 0n }, {})
    await Util.expectEncodeSuccess(schema, { a: 1n }, { a: "1" })
  })
})
