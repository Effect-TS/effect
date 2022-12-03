import * as Bigint from "@fp-ts/schema/data/Bigint"
import * as D from "@fp-ts/schema/Decoder"
import * as Util from "@fp-ts/schema/test/util"

describe("Bigint", () => {
  it("property tests", () => {
    Util.property(Bigint.Schema)
  })

  it("Guard", () => {
    const guard = Bigint.Guard
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(0n)).toEqual(true)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("UnknownDecoder", () => {
    const decoder = Bigint.UnknownDecoder

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
    const encoder = Bigint.JsonEncoder
    expect(encoder.encode(1n)).toEqual("1")
  })
})
