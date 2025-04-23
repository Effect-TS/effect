import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as C from "effect/Chunk"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ChunkFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ChunkFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ChunkFromSelf(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, C.empty(), C.empty())
    await Util.assertions.decoding.succeed(
      schema,
      C.fromIterable(["1", "2", "3"]),
      C.fromIterable([1, 2, 3])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected Chunk<NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      C.fromIterable(["1", "a", "3"]),
      `Chunk<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [1]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.ChunkFromSelf(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, C.empty(), C.empty())
    await Util.assertions.encoding.succeed(
      schema,
      C.fromIterable([1, 2, 3]),
      C.fromIterable(["1", "2", "3"])
    )
  })

  it("is", () => {
    const schema = S.ChunkFromSelf(S.String)
    const is = P.is(schema)
    assertTrue(is(C.empty()))
    assertTrue(is(C.fromIterable(["a", "b", "c"])))

    assertFalse(is(C.fromIterable(["a", "b", 1])))
    assertFalse(is({ _id: Symbol.for("effect/Schema/test/FakeChunk") }))
  })

  it("pretty", () => {
    const schema = S.ChunkFromSelf(S.String)
    Util.assertions.pretty(schema, C.empty(), "Chunk()")
    Util.assertions.pretty(schema, C.fromIterable(["a", "b"]), `Chunk("a", "b")`)
  })
})
