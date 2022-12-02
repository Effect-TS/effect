import * as set from "@fp-ts/schema/data/Set"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as S from "@fp-ts/schema/Schema"

const encoderFor = JE.provideJsonEncoderFor(set.Provider)

describe("JsonEncoder", () => {
  describe("provideJsonEncoderFor", () => {
    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      const encoder = encoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
    })
  })
})
