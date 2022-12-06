import * as _ from "@fp-ts/schema/data/filter/MaxLength"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("MaxLength", () => {
  it("id", () => {
    expect(_.id).exist
  })

  it("Guard", () => {
    const guard = G.guardFor(_.schema(1)(S.string))
    expect(guard.is("")).toEqual(true)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.schema(1)(S.string))
    expect(decoder.decode("")).toEqual(D.success(""))
    expect(decoder.decode("a")).toEqual(D.success("a"))
    Util.expectFailure(decoder, "aa", "\"aa\" did not satisfy MaxLength(1)")
  })
})
