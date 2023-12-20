import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/compose", async () => {
  it("B = C", async () => {
    const schema1 = S.compose(S.split(","), S.array(S.NumberFromString))
    await Util.expectParseSuccess(schema1, "1,2,3", [1, 2, 3])
    const schema2 = S.split(",").pipe(S.compose(S.array(S.NumberFromString)))
    await Util.expectParseSuccess(schema2, "1,2,3", [1, 2, 3])
  })

  it("force decoding: (A U B) compose (B -> C)", async () => {
    const schema1 = S.compose(S.union(S.null, S.string), S.NumberFromString)
    await Util.expectParseSuccess(schema1, "1", 1)
    await Util.expectParseFailure(schema1, "a", `Expected string <-> number, actual "a"`)
    await Util.expectParseFailure(schema1, null, "Expected string, actual null")
    const schema2 = S.union(S.null, S.string).pipe(
      S.compose(S.NumberFromString)
    )
    await Util.expectParseSuccess(schema2, "1", 1)
    await Util.expectParseFailure(schema2, "a", `Expected string <-> number, actual "a"`)
    await Util.expectParseFailure(schema2, null, "Expected string, actual null")
  })

  it("force encoding: (A -> B) compose (C U B)", async () => {
    const schema1 = S.compose(S.NumberFromString, S.union(S.null, S.number))
    await Util.expectEncodeSuccess(schema1, 1, "1")
    await Util.expectEncodeFailure(schema1, null, "Expected number, actual null")
    const schema2 = S.NumberFromString.pipe(
      S.compose(S.union(S.null, S.number))
    )
    await Util.expectEncodeSuccess(schema2, 1, "1")
    await Util.expectEncodeFailure(schema2, null, "Expected number, actual null")
  })
})
