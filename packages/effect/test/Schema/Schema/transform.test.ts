import { describe, it } from "@effect/vitest"
import * as Schema from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("transform", () => {
  it("should receive the fromI value other than the fromA value", async () => {
    const A = Schema.Struct({
      a: Schema.NumberFromString
    })

    const B = Schema.Struct({
      a: Schema.String,
      b: Schema.NumberFromString
    })

    const AB = Schema.transform(B, A, {
      strict: true,
      decode: ({ a, b: _b }, i) => ({ a: a + i.b }),
      encode: (i, a) => ({ ...i, b: a.a * 2 })
    })

    await Util.assertions.decoding.succeed(AB, { a: "1", b: "2" }, { a: 12 })
    await Util.assertions.encoding.succeed(AB, { a: 2 }, { a: "2", b: "4" })
  })
})
