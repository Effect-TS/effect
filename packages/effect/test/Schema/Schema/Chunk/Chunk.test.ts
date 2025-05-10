import { describe, it } from "@effect/vitest"
import * as C from "effect/Chunk"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Chunk", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Chunk(S.Number))
  })

  it("decoding", async () => {
    const schema = S.Chunk(S.Number)
    await Util.assertions.decoding.succeed(schema, [], C.empty())
    await Util.assertions.decoding.succeed(schema, [1, 2, 3], C.fromIterable([1, 2, 3]))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<number> <-> Chunk<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> Chunk<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.Chunk(S.Number)
    await Util.assertions.encoding.succeed(schema, C.empty(), [])
    await Util.assertions.encoding.succeed(schema, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
