import * as L from "@fp-ts/data/List"
import * as _ from "@fp-ts/schema/data/List"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("List", () => {
  it("id", () => {
    expect(_.id).exist
  })

  it("Provider", () => {
    expect(_.Provider).exist
  })

  it("property tests", () => {
    Util.property(_.schema(S.number))
  })

  it("guard", () => {
    const schema = _.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(L.empty())).toEqual(true)
    expect(guard.is(L.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(L.fromIterable(["a", "b", 1]))).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.schema(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(L.empty()))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(L.fromIterable([1, 2, 3]))
    )
    // should handle warnings
    Util.expectWarning(
      decoder,
      [1, NaN, 3],
      "/1 did not satisfy not(isNaN)",
      L.fromIterable([1, NaN, 3])
    )
    Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
    Util.expectFailure(decoder, [1, "a"], "/1 \"a\" did not satisfy is(number)")
  })

  it("Encoder", () => {
    const schema = _.schema(S.number)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(L.empty())).toEqual([])
    expect(encoder.encode(L.fromIterable([1, 2, 3]))).toEqual(
      [1, 2, 3]
    )
  })

  it("Pretty", () => {
    const schema = _.schema(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(L.empty())).toEqual("List()")
    expect(pretty.pretty(L.fromIterable(["a", "b"]))).toEqual(
      "List(\"a\", \"b\")"
    )
  })
})
