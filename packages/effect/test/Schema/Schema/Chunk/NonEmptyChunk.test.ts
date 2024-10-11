import * as C from "effect/Chunk"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonEmptyChunk", () => {
  it("property tests", () => {
    Util.roundtrip(S.NonEmptyChunk(S.Number))
  })

  it("decoding", async () => {
    const schema = S.NonEmptyChunk(S.Number)
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3], C.make(1, 2, 3))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(readonly [number, ...number[]] <-> NonEmptyChunk<number>)
└─ Encoded side transformation failure
   └─ Expected readonly [number, ...number[]], actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(readonly [number, ...number[]] <-> NonEmptyChunk<number>)
└─ Encoded side transformation failure
   └─ readonly [number, ...number[]]
      └─ [1]
         └─ Expected number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.NonEmptyChunk(S.Number)
    await Util.expectEncodeSuccess(schema, C.make(1, 2, 3), [1, 2, 3])
  })
})
