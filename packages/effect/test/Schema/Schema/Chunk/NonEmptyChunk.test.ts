import { describe, it } from "@effect/vitest"
import * as C from "effect/Chunk"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NonEmptyChunk", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.NonEmptyChunk(S.Number))
  })

  it("decoding", async () => {
    const schema = S.NonEmptyChunk(S.Number)
    await Util.assertions.decoding.succeed(schema, [1, 2, 3], C.make(1, 2, 3))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(readonly [number, ...number[]] <-> NonEmptyChunk<number>)
└─ Encoded side transformation failure
   └─ Expected readonly [number, ...number[]], actual null`
    )
    await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.succeed(schema, C.make(1, 2, 3), [1, 2, 3])
  })
})
