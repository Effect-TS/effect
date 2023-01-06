import * as _ from "@fp-ts/schema/data/UUID"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("UUID", () => {
  const schema = _.UUID

  it("keyof", () => {
    expect(S.keyof(schema)).toEqual(S.literal("length"))
  })

  it("property tests", () => {
    Util.property(schema)
  })
})
