import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as N from "effect/Number"
import * as SortedSet from "effect/SortedSet"
import { describe, it } from "vitest"

describe("SortedSet > sortedSet", () => {
  it("property tests", () => {
    Util.roundtrip(S.sortedSet(N.Order)(S.number))
  })

  it("decoding", async () => {
    const schema = S.sortedSet(N.Order)(S.number)
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
└─ From side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> SortedSet<number>)
└─ From side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.sortedSet(N.Order)(S.number)
    await Util.expectEncodeSuccess(schema, SortedSet.fromIterable([] as Array<number>, N.Order), [])
    await Util.expectEncodeSuccess(schema, SortedSet.fromIterable([1, 2, 3] as Array<number>, N.Order), [1, 2, 3])
  })
})
