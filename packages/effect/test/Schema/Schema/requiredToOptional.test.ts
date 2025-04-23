import { describe, it } from "@effect/vitest"
import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("requiredToOptional", () => {
  it("two transformation schemas", async () => {
    const ps = S.requiredToOptional(
      S.NumberFromString,
      S.BigIntFromNumber,
      { decode: Option.liftPredicate((n) => n !== 0), encode: Option.getOrElse(() => 0) }
    )
    const schema = S.Struct({ a: ps })
    await Util.assertions.decoding.succeed(schema, { a: "0" }, {})
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1n })

    await Util.assertions.encoding.succeed(schema, {}, { a: "0" })
    await Util.assertions.encoding.succeed(schema, { a: 1n }, { a: "1" })
  })
})
