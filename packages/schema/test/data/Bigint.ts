import * as Bigint from "@fp-ts/schema/data/Bigint"
import * as DE from "@fp-ts/schema/DecodeError"
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

  describe("UnknownDecoder", () => {
    const decoder = Bigint.UnknownDecoder

    it("baseline", () => {
      expect(decoder.decode(0n)).toEqual(D.success(0n))
      expect(decoder.decode(1n)).toEqual(D.success(1n))
      expect(decoder.decode("1")).toEqual(D.success(1n))
      expect(decoder.decode(null)).toEqual(
        D.failure(DE.notType("string | number | bigint | boolean", null))
      )
      expect(decoder.decode(1.2)).toEqual(
        D.failure(
          DE.notType(
            "RangeError: The number 1.2 cannot be converted to a BigInt because it is not an integer",
            1.2
          )
        )
      )
    })
  })

  it("JsonEncoder", () => {
    const encoder = Bigint.JsonEncoder
    expect(encoder.encode(1n)).toEqual("1")
  })
})
