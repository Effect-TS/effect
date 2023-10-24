import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("boolean/not", () => {
  const schema = S.boolean.pipe(S.not)
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, true, false)
    await Util.expectParseSuccess(schema, false, true)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, true, false)
    await Util.expectEncodeSuccess(schema, false, true)
  })
})
