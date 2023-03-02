import * as O from "@effect/schema/data/Object"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = S.instanceOf(Set)

describe.concurrent("Object", () => {
  it("exports", () => {
    expect(O.InstanceOfTypeId).exist
  })

  describe.concurrent("instanceOf", () => {
    it("Guard", () => {
      const is = P.is(schema)
      expect(is(new Set())).toEqual(true)
      expect(is(1)).toEqual(false)
      expect(is({})).toEqual(false)
    })

    it("Decoder", () => {
      Util.expectDecodingSuccess(schema, new Set())
      Util.expectDecodingFailure(schema, 1, `Expected object, actual 1`)
      Util.expectDecodingFailure(schema, {}, `Expected an instance of Set, actual {}`)
    })

    it("Pretty", () => {
      const pretty = Pretty.pretty(schema)
      expect(pretty(new Set())).toEqual("{}")
    })
  })
})
