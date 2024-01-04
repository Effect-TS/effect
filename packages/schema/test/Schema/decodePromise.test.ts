import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > decodePromise", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", async () => {
    await Util.resolves(S.decodePromise(schema)({ a: "1" }), { a: 1 })
    await Util.rejects(S.decodePromise(schema)({ a: "10" }))
  })

  it("should respect outer/inner options", async () => {
    const input = { a: "1", b: "b" }
    await Util.rejects(S.decodePromise(schema)(input, { onExcessProperty: "error" }))
    await Util.rejects(S.decodePromise(schema, { onExcessProperty: "error" })(input))
    await Util.resolves(S.decodePromise(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})
