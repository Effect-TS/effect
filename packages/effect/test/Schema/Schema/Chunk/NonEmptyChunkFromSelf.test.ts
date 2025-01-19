import * as Arbitrary from "effect/Arbitrary"
import * as C from "effect/Chunk"
import * as FastCheck from "effect/FastCheck"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("NonEmptyChunkFromSelf", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.NonEmptyChunkFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.NonEmptyChunkFromSelf(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(
      schema,
      C.make("1", "2", "3"),
      C.make(1, 2, 3)
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected NonEmptyChunk<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      C.empty(),
      `Expected NonEmptyChunk<NumberFromString>, actual {
  "_id": "Chunk",
  "values": []
}`
    )
    await Util.expectDecodeUnknownFailure(
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
    await Util.expectEncodeSuccess(
      schema,
      C.make(1, 2, 3),
      C.make("1", "2", "3")
    )
  })

  it("pretty", () => {
    const schema = S.NonEmptyChunkFromSelf(S.String)
    const pretty = Pretty.make(schema)
    expect(pretty(C.make("a", "b"))).toEqual(
      `NonEmptyChunk("a", "b")`
    )
  })

  it("equivalence", () => {
    const schema = S.NonEmptyChunkFromSelf(S.String)
    const equivalence = S.equivalence(schema)
    expect(equivalence(C.make("a", "b"), C.make("a", "b"))).toEqual(true)
    expect(equivalence(C.make("a", "b"), C.make("a", "c"))).toEqual(false)
    expect(equivalence(C.make("a", "b"), C.make("a"))).toEqual(false)
  })

  it("arbitrary", () => {
    const schema = S.NonEmptyChunkFromSelf(S.String)
    const arb = Arbitrary.make(schema)
    FastCheck.assert(FastCheck.property(arb, C.isNonEmpty))
    expect(FastCheck.sample(arb, 10).every(C.isNonEmpty)).toBe(true)
  })
})
