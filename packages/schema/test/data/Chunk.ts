import * as C from "@effect/data/Chunk"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.numberFromString(S.string)

describe.concurrent("Chunk", () => {
  it("chunkFromSelf. keyof", () => {
    expect(S.keyof(S.chunkFromSelf(S.string))).toEqual(
      S.union(S.literal("_id"), S.literal("length"))
    )
  })

  it("chunkFromSelf. property tests", () => {
    Util.roundtrip(S.chunkFromSelf(S.number))
  })

  it("chunkFromSelf. decoder", () => {
    const schema = S.chunkFromSelf(NumberFromString)
    Util.expectDecodingSuccess(schema, C.empty(), C.empty())
    Util.expectDecodingSuccess(schema, C.fromIterable(["1", "2", "3"]), C.fromIterable([1, 2, 3]))

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected Chunk, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      C.fromIterable(["1", "a", "3"]),
      `/1 Expected a parsable value from string to number, actual "a"`
    )
  })

  it("chunkFromSelf. encoder", () => {
    const schema = S.chunkFromSelf(NumberFromString)
    Util.expectEncodingSuccess(schema, C.empty(), C.empty())
    Util.expectEncodingSuccess(schema, C.fromIterable([1, 2, 3]), C.fromIterable(["1", "2", "3"]))
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

  it("chunk. decoder", () => {
    const schema = S.chunk(S.number)
    Util.expectDecodingSuccess(schema, [], C.empty())
    Util.expectDecodingSuccess(schema, [1, 2, 3], C.fromIterable([1, 2, 3]))

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected <anonymous tuple or array schema>, actual null`
    )
    Util.expectDecodingFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("chunk. encoder", () => {
    const schema = S.chunk(S.number)
    Util.expectEncodingSuccess(schema, C.empty(), [])
    Util.expectEncodingSuccess(schema, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
