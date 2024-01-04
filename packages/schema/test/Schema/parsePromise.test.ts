import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > parsePromise", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.resolves(S.parsePromise(schema)({ a: "1" }), { a: 1 })
    await Util.rejects(S.parsePromise(schema)({ a: "10" }))
  })

  it("should respect outer/inner options", async () => {
    const input = { a: "1", b: "b" }
    await Util.rejects(S.parsePromise(schema)(input, { onExcessProperty: "error" }))
    await Util.rejects(S.parsePromise(schema, { onExcessProperty: "error" })(input))
    await Util.resolves(S.parsePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})
