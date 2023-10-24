import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/clamp", () => {
  it("decoding", async () => {
    const schema = S.number.pipe(S.clamp(-1, 1))
    await Util.expectParseSuccess(schema, 3, 1)
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseSuccess(schema, -3, -1)
  })

  it("should support doubles as constraints", async () => {
    const schema = S.number.pipe(S.clamp(1.3, 3.1))
    await Util.expectParseSuccess(schema, 4, 3.1)
    await Util.expectParseSuccess(schema, 2, 2)
    await Util.expectParseSuccess(schema, 1, 1.3)
  })
})
