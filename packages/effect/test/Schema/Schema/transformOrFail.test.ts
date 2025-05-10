import { describe, it } from "@effect/vitest"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("transformOrFail", () => {
  it("should receive the fromI value other than the fromA value", async () => {
    const A = Schema.Struct({
      a: Schema.NumberFromString
    })

    const B = Schema.Struct({
      a: Schema.String,
      b: Schema.NumberFromString
    })

    const AB = Schema.transformOrFail(B, A, {
      strict: true,
      decode: ({ a, b: _b }, _options, _ast, i) => ParseResult.succeed({ a: a + i.b }),
      encode: (i, _options, _ast, a) => ParseResult.succeed({ ...i, b: a.a * 2 })
    })

    await Util.assertions.decoding.succeed(AB, { a: "1", b: "2" }, { a: 12 })
    await Util.assertions.encoding.succeed(AB, { a: 2 }, { a: "2", b: "4" })
  })
})
