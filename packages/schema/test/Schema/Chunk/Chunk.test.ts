import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as C from "effect/Chunk"
import { describe, it } from "vitest"

describe("Chunk", () => {
  it("property tests", () => {
    Util.roundtrip(S.Chunk(S.Number))
  })

  it("decoding", async () => {
    const schema = S.Chunk(S.Number)
    await Util.expectDecodeUnknownSuccess(schema, [], C.empty())
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3], C.fromIterable([1, 2, 3]))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<number> <-> Chunk<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> Chunk<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.Chunk(S.Number)
    await Util.expectEncodeSuccess(schema, C.empty(), [])
    await Util.expectEncodeSuccess(schema, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
