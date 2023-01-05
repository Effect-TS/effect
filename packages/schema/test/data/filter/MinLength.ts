import * as _ from "@fp-ts/schema/data/filter"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("minLength", () => {
  it("property tests", () => {
    Util.property(_.minLength(0)(S.string))
  })

  it("Guard", () => {
    const guard = G.guardFor(_.minLength(1)(S.string))
    expect(guard.is("")).toEqual(false)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(true)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.minLength(1)(S.string))
    Util.expectDecodingSuccess(decoder, "a")
    Util.expectDecodingSuccess(decoder, "aa")
    Util.expectDecodingFailure(decoder, "", `"" did not satisfy refinement({"minLength":1})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.minLength(0)(S.string))
    expect(pretty.pretty("a")).toEqual(`"a"`)
  })
})
