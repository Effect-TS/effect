import * as _ from "@fp-ts/schema/data/refinement"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("maxLength", () => {
  it("property tests", () => {
    Util.property(_.maxLength(0)(S.string))
  })

  it("Guard", () => {
    const guard = G.guardFor(_.maxLength(1)(S.string))
    expect(guard.is("")).toEqual(true)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.maxLength(1)(S.string))
    Util.expectSuccess(decoder, "")
    Util.expectSuccess(decoder, "a")
    Util.expectFailure(decoder, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.maxLength(0)(S.string))
    expect(pretty.pretty("a")).toEqual(`"a"`)
  })
})
