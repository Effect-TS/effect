import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as C from "effect/Chunk"
import { describe, it } from "vitest"

describe("Chunk/chunk", () => {
  it("property tests", () => {
    Util.roundtrip(S.chunk(S.number))
  })

  it("decoding", async () => {
    const schema = S.chunk(S.number)
    await Util.expectParseSuccess(schema, [], C.empty())
    await Util.expectParseSuccess(schema, [1, 2, 3], C.fromIterable([1, 2, 3]))

    await Util.expectParseFailure(
      schema,
      null,
      `Expected <anonymous tuple or array schema>, actual null`
    )
    await Util.expectParseFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("encoding", async () => {
    const schema = S.chunk(S.number)
    await Util.expectEncodeSuccess(schema, C.empty(), [])
    await Util.expectEncodeSuccess(schema, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
