import { describe, it } from "@effect/vitest"
import * as List from "effect/List"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("List", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.List(S.Number))
  })

  it("decoding", async () => {
    const schema = S.List(S.Number)
    await Util.assertions.decoding.succeed(schema, [], List.empty())
    await Util.assertions.decoding.succeed(schema, [1, 2, 3], List.fromIterable([1, 2, 3]))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<number> <-> List<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> List<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.List(S.Number)
    await Util.assertions.encoding.succeed(schema, List.empty(), [])
    await Util.assertions.encoding.succeed(schema, List.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
