import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as HashSet from "effect/HashSet"
import { describe, it } from "vitest"

describe("HashSet", () => {
  it("property tests", () => {
    Util.roundtrip(S.HashSet(S.Number))
  })

  it("decoding", async () => {
    const schema = S.HashSet(S.Number)
    await Util.expectDecodeUnknownSuccess(schema, [], HashSet.empty())
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3], HashSet.fromIterable([1, 2, 3]))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<number> <-> HashSet<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> HashSet<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.HashSet(S.Number)
    await Util.expectEncodeSuccess(schema, HashSet.empty(), [])
    await Util.expectEncodeSuccess(schema, HashSet.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
