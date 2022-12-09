import * as O from "@fp-ts/data/Option"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("Option", () => {
  it("id", () => {
    expect(DataOption.id).exist
  })

  it("Provider", () => {
    expect(DataOption.Provider).exist
  })

  // it("property tests", () => {
  //   Util.property(DataOption.schema(S.number))
  // })

  it("Decoder", () => {
    const schema = DataOption.schema(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode(null)).toEqual(D.success(O.none))
    expect(decoder.decode(1)).toEqual(D.success(O.some(1)))

    Util.expectFailure(
      decoder,
      {},
      "member 0: {} did not satisfy isEqual(null), member 1: {} did not satisfy is(number)"
    )
  })

  it("Encoder", () => {
    const schema = DataOption.schema(S.number)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(O.none)).toEqual(null)
  })

  it("Pretty", () => {
    const schema = DataOption.schema(S.number)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(O.none)).toEqual("none")
    expect(pretty.pretty(O.some(1))).toEqual("some(1)")
  })
})
