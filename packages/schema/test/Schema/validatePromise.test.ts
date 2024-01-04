import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > validatePromise", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.resolves(S.validatePromise(schema)({ a: 1 }), { a: 1 })
    await Util.rejects(S.validatePromise(schema)({ a: null }))
  })

  it("should respect outer/inner options", async () => {
    const input = { a: 1, b: "b" }
    await Util.rejects(S.validatePromise(schema)(input, { onExcessProperty: "error" }))
    await Util.rejects(S.validatePromise(schema, { onExcessProperty: "error" })(input))
    await Util.resolves(
      S.validatePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }),
      {
        a: 1
      }
    )
  })
})
