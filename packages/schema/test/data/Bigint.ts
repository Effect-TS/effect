import * as Bigint from "@fp-ts/schema/data/Bigint"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as Util from "@fp-ts/schema/test/util"

describe("Bigint", () => {
  const schema = Bigint.Schema

  it("id", () => {
    expect(Bigint.id).exist
  })

  it("Provider", () => {
    expect(Bigint.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(0n)).toEqual(true)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(schema)

    expect(decoder.decode(0n)).toEqual(D.success(0n))
    expect(decoder.decode(1n)).toEqual(D.success(1n))
    expect(decoder.decode("1")).toEqual(D.success(1n))
    Util.expectFailure(
      decoder,
      null,
      "null did not satisfy is(bigint)"
    )
    Util.expectFailure(
      decoder,
      1.2,
      "1.2 did not satisfy is(bigint)"
    )
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(1n)).toEqual("1")
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(1n)).toEqual("1")
  })
})
