import { describe, it } from "@effect/vitest"
import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

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

    await Util.assertions.encoding.succeed(schema, { a: 0n }, {})
    await Util.assertions.encoding.succeed(schema, { a: 1n }, { a: "1" })
  })
})
