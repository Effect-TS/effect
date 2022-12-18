import * as _ from "@fp-ts/schema/data/filter/MinLength"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("MinLength", () => {
  it("exports", () => {
    expect(_.id).exist
  })

  it("property tests", () => {
    Util.property(_.schema(0)(S.string))
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

  it("Pretty", () => {
    const pretty = P.prettyFor(_.schema(0)(S.string))
    expect(pretty.pretty("a")).toEqual(`"a"`)
  })
})
