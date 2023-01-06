import * as C from "@fp-ts/data/Chunk"
import * as _ from "@fp-ts/schema/data/Chunk"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Chunk", () => {
  it("chunk. keyof", () => {
    expect(S.keyof(_.chunk(S.string))).toEqual(S.union(S.literal("_id"), S.literal("length")))
  })

  it("chunk. guard", () => {
    const schema = _.chunk(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(C.empty())).toEqual(true)
    expect(guard.is(C.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(C.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(guard.is({ _id: Symbol.for("@fp-ts/schema/test/FakeChunk") })).toEqual(false)
  })

  it("chunk. pretty", () => {
    const schema = _.chunk(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(C.empty())).toEqual("Chunk()")
    expect(pretty.pretty(C.fromIterable(["a", "b"]))).toEqual(
      "Chunk(\"a\", \"b\")"
    )
  })

  it("fromArray. property tests", () => {
    Util.property(_.fromArray(S.number))
  })

  it("fromArray. decoder", () => {
    const schema = _.fromArray(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(DE.success(C.empty()))
    expect(decoder.decode([1, 2, 3])).toEqual(
      DE.success(C.fromIterable([1, 2, 3]))
    )

    Util.expectDecodingFailure(decoder, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(decoder, [1, "a"], `/1 "a" did not satisfy is(number)`)
  })

  it("fromArray. encoder", () => {
    const schema = _.fromArray(S.number)
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, C.empty(), [])
    Util.expectEncodingSuccess(encoder, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
