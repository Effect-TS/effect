import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as List from "effect/List"
import { describe, it } from "vitest"

describe("List", () => {
  it("property tests", () => {
    Util.roundtrip(S.List(S.Number))
  })

  it("decoding", async () => {
    const schema = S.List(S.Number)
    await Util.expectDecodeUnknownSuccess(schema, [], List.empty())
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3], List.fromIterable([1, 2, 3]))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<number> <-> List<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> List<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.List(S.Number)
    await Util.expectEncodeSuccess(schema, List.empty(), [])
    await Util.expectEncodeSuccess(schema, List.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
