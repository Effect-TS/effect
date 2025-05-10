import { describe, it } from "@effect/vitest"
import * as N from "effect/Number"
import * as S from "effect/Schema"
import * as SortedSet from "effect/SortedSet"
import * as Util from "../../TestUtils.js"

describe("SortedSet", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.SortedSet(S.Number, N.Order))
  })

  it("decoding", async () => {
    const schema = S.SortedSet(S.Number, N.Order)
    await Util.assertions.decoding.succeed(schema, [], SortedSet.fromIterable([] as Array<number>, N.Order))
    await Util.assertions.decoding.succeed(
      schema,
      [1, 2, 3],
      SortedSet.fromIterable([1, 2, 3] as Array<number>, N.Order)
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<number> <-> SortedSet<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.succeed(schema, SortedSet.fromIterable([] as Array<number>, N.Order), [])
    await Util.assertions.encoding.succeed(schema, SortedSet.fromIterable([1, 2, 3] as Array<number>, N.Order), [
      1,
      2,
      3
    ])
  })
})
