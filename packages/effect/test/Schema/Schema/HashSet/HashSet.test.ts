import { describe, it } from "@effect/vitest"
import * as HashSet from "effect/HashSet"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("HashSet", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.HashSet(S.Number))
  })

  it("decoding", async () => {
    const schema = S.HashSet(S.Number)
    await Util.assertions.decoding.succeed(schema, [], HashSet.fromIterable([]))
    await Util.assertions.decoding.succeed(schema, [1, 2, 3], HashSet.fromIterable([1, 2, 3]))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<number> <-> HashSet<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> HashSet<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.HashSet(S.Number)
    await Util.assertions.encoding.succeed(schema, HashSet.empty(), [])
    await Util.assertions.encoding.succeed(schema, HashSet.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
