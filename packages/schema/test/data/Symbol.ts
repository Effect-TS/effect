import * as _ from "@fp-ts/schema/data/Symbol"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as Util from "@fp-ts/schema/test/util"

describe("Symbol", () => {
  const schema = _.Schema
  const a = Symbol.for("a")

  it("id", () => {
    expect(_.id).exist
  })

  it("Provider", () => {
    expect(_.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(a)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(schema)
    expect(decoder.decode(a)).toEqual(D.success(a))
    Util.expectFailure(decoder, 1, "1 did not satisfy is(symbol)")
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(a)).toEqual(a)
  })
})
