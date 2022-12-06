import * as _ from "@fp-ts/schema/data/filter/MinLength"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("MinLength", () => {
  it("id", () => {
    expect(_.id).exist
  })

  it("Guard", () => {
    const guard = G.guardFor(_.schema(1)(S.string))
    expect(guard.is("")).toEqual(false)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(true)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.schema(1)(S.string))
    expect(decoder.decode("a")).toEqual(D.success("a"))
    expect(decoder.decode("aa")).toEqual(D.success("aa"))
    Util.expectFailure(decoder, "", "\"\" did not satisfy MinLength(1)")
  })
})
