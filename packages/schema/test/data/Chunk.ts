import * as C from "@fp-ts/data/Chunk"
import * as _ from "@fp-ts/schema/data/Chunk"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Chunk", () => {
  it("property tests", () => {
    Util.property(_.schema(S.number))
  })

  it("guard", () => {
    const schema = _.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(C.empty())).toEqual(true)
    expect(guard.is(C.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(C.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(guard.is({ _id: Symbol.for("@fp-ts/schema/test/FakeChunk") })).toEqual(false)
  })

  it("decoder", () => {
    const schema = _.schema(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(C.empty()))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(C.fromIterable([1, 2, 3]))
    )

    Util.expectFailure(decoder, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(decoder, [1, "a"], `/1 "a" did not satisfy is(number)`)
  })

  it("encoder", () => {
    const schema = _.schema(S.number)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(C.empty())).toEqual([])
    expect(encoder.encode(C.fromIterable([1, 2, 3]))).toEqual(
      [1, 2, 3]
    )
  })

  it("pretty", () => {
    const schema = _.schema(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(C.empty())).toEqual("Chunk()")
    expect(pretty.pretty(C.fromIterable(["a", "b"]))).toEqual(
      "Chunk(\"a\", \"b\")"
    )
  })
})
