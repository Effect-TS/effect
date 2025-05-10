import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as Arbitrary from "effect/Arbitrary"
import * as C from "effect/Chunk"
import * as FastCheck from "effect/FastCheck"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NonEmptyChunkFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.NonEmptyChunkFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.NonEmptyChunkFromSelf(S.NumberFromString)
    await Util.assertions.decoding.succeed(
      schema,
      C.make("1", "2", "3"),
      C.make(1, 2, 3)
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected NonEmptyChunk<NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      C.empty(),
      `Expected NonEmptyChunk<NumberFromString>, actual {
  "_id": "Chunk",
  "values": []
}`
    )
    await Util.assertions.decoding.fail(
      schema,
      C.make("1", "a", "3"),
      `NonEmptyChunk<NumberFromString>
└─ readonly [NumberFromString, ...NumberFromString[]]
   └─ [1]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.NonEmptyChunkFromSelf(S.NumberFromString)
    await Util.assertions.encoding.succeed(
      schema,
      C.make(1, 2, 3),
      C.make("1", "2", "3")
    )
  })

  it("pretty", () => {
    const schema = S.NonEmptyChunkFromSelf(S.String)
    Util.assertions.pretty(schema, C.make("a", "b"), `NonEmptyChunk("a", "b")`)
  })

  it("equivalence", () => {
    const schema = S.NonEmptyChunkFromSelf(S.String)
    const equivalence = S.equivalence(schema)
    assertTrue(equivalence(C.make("a", "b"), C.make("a", "b")))
    assertFalse(equivalence(C.make("a", "b"), C.make("a", "c")))
    assertFalse(equivalence(C.make("a", "b"), C.make("a")))
  })

  it("arbitrary", () => {
    const schema = S.NonEmptyChunkFromSelf(S.String)
    const arb = Arbitrary.make(schema)
    FastCheck.assert(FastCheck.property(arb, C.isNonEmpty))
    assertTrue(FastCheck.sample(arb, 10).every(C.isNonEmpty))
  })
})
