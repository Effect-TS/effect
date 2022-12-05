import * as Bigint from "@fp-ts/schema/data/Bigint"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("Bigint", () => {
  const schema = Bigint.Schema

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(0n)).toEqual(true)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("UnknownDecoder", () => {
    const decoder = UD.unknownDecoderFor(schema)

    expect(decoder.decode(0n)).toEqual(D.success(0n))
    expect(decoder.decode(1n)).toEqual(D.success(1n))
    expect(decoder.decode("1")).toEqual(D.success(1n))
    Util.expectFailure(
      decoder,
      null,
      "null did not satisfy is(string | number | bigint | boolean)"
    )
    Util.expectFailure(
      decoder,
      1.2,
      "1.2 \"The number 1.2 cannot be converted to a BigInt because it is not an integer\""
    )
  })

  it("JsonEncoder", () => {
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode(1n)).toEqual("1")
  })
})
