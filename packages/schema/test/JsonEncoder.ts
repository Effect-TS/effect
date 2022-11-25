import * as set from "@fp-ts/schema/data/Set"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as S from "@fp-ts/schema/Schema"

const unsafeEncoderFor = JE.provideUnsafeJsonEncoderFor(set.Provider)

describe("JsonEncoder", () => {
  describe("provideUnsafeJsonEncoderFor", () => {
    it("string", () => {
      const schema = S.string
      const encoder = unsafeEncoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
    })

    it("number", () => {
      const schema = S.number
      const encoder = unsafeEncoderFor(schema)
      expect(encoder.encode(1)).toEqual(1)
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      const encoder = unsafeEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
    })
  })
})
