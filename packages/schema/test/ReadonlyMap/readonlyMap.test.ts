import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlyMap/readonlyMap", () => {
  it("property tests", () => {
    Util.roundtrip(S.readonlyMap(S.number, S.string))
  })

  it("decoding", async () => {
    const schema = S.readonlyMap(S.number, S.string)
    await Util.expectParseSuccess(schema, [], new Map())
    await Util.expectParseSuccess(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectParseFailure(
      schema,
      null,
      `Expected <anonymous tuple or array schema>, actual null`
    )
    await Util.expectParseFailure(
      schema,
      [[1, "a"], [2, 1]],
      `/1 /1 Expected string, actual 1`
    )
  })

  it("encoding", async () => {
    const schema = S.readonlyMap(S.number, S.string)
    await Util.expectEncodeSuccess(schema, new Map(), [])
    await Util.expectEncodeSuccess(schema, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
