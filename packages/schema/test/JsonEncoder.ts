import { pipe } from "@fp-ts/data/Function"
import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as S from "@fp-ts/schema/Schema"

const NumberFromString = pipe(S.string, parseFloat.schema)

describe("JsonEncoder", () => {
  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, NumberFromString)
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", "1"])
    })

    it("rest element", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.withRest(NumberFromString))
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
      expect(encoder.encode(["a", 1, 2])).toEqual(["a", 1, "2"])
    })
  })
})
