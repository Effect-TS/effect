import * as N from "effect/Number"
import * as S from "effect/Schema"
import * as SortedSet from "effect/SortedSet"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("SortedSet", () => {
  it("property tests", () => {
    Util.roundtrip(S.SortedSet(S.Number, N.Order))
  })

  it("decoding", async () => {
    const schema = S.SortedSet(S.Number, N.Order)
    await Util.expectDecodeUnknownSuccess(schema, [], SortedSet.fromIterable([] as Array<number>, N.Order))
    await Util.expectDecodeUnknownSuccess(
      schema,
      [1, 2, 3],
      SortedSet.fromIterable([1, 2, 3] as Array<number>, N.Order)
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<number> <-> SortedSet<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> SortedSet<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.SortedSet(S.Number, N.Order)
    await Util.expectEncodeSuccess(schema, SortedSet.fromIterable([] as Array<number>, N.Order), [])
    await Util.expectEncodeSuccess(schema, SortedSet.fromIterable([1, 2, 3] as Array<number>, N.Order), [1, 2, 3])
  })
})
