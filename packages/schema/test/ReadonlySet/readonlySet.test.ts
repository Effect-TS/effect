import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlySet/readonlySet", () => {
  it("property tests", () => {
    Util.roundtrip(S.readonlySet(S.number))
  })

  it("decoding", async () => {
    const schema = S.readonlySet(S.number)
    await Util.expectParseSuccess(schema, [], new Set([]))
    await Util.expectParseSuccess(schema, [1, 2, 3], new Set([1, 2, 3]))

    await Util.expectParseFailure(
      schema,
      null,
      `Expected <anonymous tuple or array schema>, actual null`
    )
    await Util.expectParseFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("encoding", async () => {
    const schema = S.readonlySet(S.number)
    await Util.expectEncodeSuccess(schema, new Set(), [])
    await Util.expectEncodeSuccess(schema, new Set([1, 2, 3]), [1, 2, 3])
  })
})
