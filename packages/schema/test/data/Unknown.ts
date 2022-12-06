import * as Unknown from "@fp-ts/schema/data/Unknown"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe("Unknown", () => {
  const schema = Unknown.Schema

  it("id", () => {
    expect(Unknown.id).exist
  })

  it("Provider", () => {
    expect(Unknown.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(true)).toEqual(true)
    expect(guard.is(false)).toEqual(true)
    expect(guard.is(1)).toEqual(true)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(schema)
    expect(decoder.decode(true)).toEqual(D.success(true))
    expect(decoder.decode(false)).toEqual(D.success(false))
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(1)).toEqual("1")
  })
})
