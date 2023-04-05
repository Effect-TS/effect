import * as C from "@effect/data/Chunk"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.NumberFromString

describe.concurrent("Chunk", () => {
  it("chunkFromSelf. keyof", () => {
    expect(S.keyof(S.chunkFromSelf(S.string))).toEqual(
      S.union(S.literal("_id"), S.literal("length"))
    )
  })

  it("chunkFromSelf. property tests", () => {
    Util.roundtrip(S.chunkFromSelf(S.number))
  })

  it("chunkFromSelf. decoder", async () => {
    const schema = S.chunkFromSelf(NumberFromString)
    await Util.expectParseSuccess(schema, C.empty(), C.empty())
    await Util.expectParseSuccess(
      schema,
      C.fromIterable(["1", "2", "3"]),
      C.fromIterable([1, 2, 3])
    )

    await Util.expectParseFailure(
      schema,
      null,
      `Expected Chunk, actual null`
    )
    await Util.expectParseFailure(
      schema,
      C.fromIterable(["1", "a", "3"]),
      `/1 Expected string -> number, actual "a"`
    )
  })

  it("chunkFromSelf. encoder", async () => {
    const schema = S.chunkFromSelf(NumberFromString)
    await Util.expectEncodeSuccess(schema, C.empty(), C.empty())
    await Util.expectEncodeSuccess(
      schema,
      C.fromIterable([1, 2, 3]),
      C.fromIterable(["1", "2", "3"])
    )
  })

  it("chunkFromSelf. guard", () => {
    const schema = S.chunkFromSelf(S.string)
    const is = P.is(schema)
    expect(is(C.empty())).toEqual(true)
    expect(is(C.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(is(C.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(is({ _id: Symbol.for("@effect/schema/test/FakeChunk") })).toEqual(false)
  })

  it("chunkFromSelf. pretty", () => {
    const schema = S.chunkFromSelf(S.string)
    const pretty = Pretty.to(schema)
    expect(pretty(C.empty())).toEqual("Chunk()")
    expect(pretty(C.fromIterable(["a", "b"]))).toEqual(
      "Chunk(\"a\", \"b\")"
    )
  })

  it("chunk. property tests", () => {
    Util.roundtrip(S.chunk(S.number))
  })

  it("chunk. decoder", async () => {
    const schema = S.chunk(S.number)
    await Util.expectParseSuccess(schema, [], C.empty())
    await Util.expectParseSuccess(schema, [1, 2, 3], C.fromIterable([1, 2, 3]))

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("chunk. encoder", async () => {
    const schema = S.chunk(S.number)
    await Util.expectEncodeSuccess(schema, C.empty(), [])
    await Util.expectEncodeSuccess(schema, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
