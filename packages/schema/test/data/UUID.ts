import * as _ from "@effect/schema/data/UUID"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("UUID", () => {
  const schema = _.UUID

  it("keyof", () => {
    expect(S.keyof(schema)).toEqual(S.literal("length"))
  })

  it("property tests", () => {
    Util.property(schema)
  })
})
