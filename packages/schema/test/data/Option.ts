import * as O from "@fp-ts/data/Option"
import * as _ from "@fp-ts/schema/data/Option"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Option", () => {
  it("fromNullable. property tests", () => {
    Util.property(_.fromNullable(S.number))
  })

  it("option. guard. direct", () => {
    const schema = _.option(S.number)
    const is = P.is(schema)
    expect(is(O.none)).toEqual(true)
    expect(is(O.some(1))).toEqual(true)
    expect(is(O.some("a"))).toEqual(false)
  })

  it("fromNullable. decoder", () => {
    const schema = _.fromNullable(S.number)
    Util.expectDecodingSuccess(schema, undefined, O.none)
    Util.expectDecodingSuccess(schema, null, O.none)
    Util.expectDecodingSuccess(schema, 1, O.some(1))

    Util.expectDecodingFailureTree(
      schema,
      {},
      `3 error(s) found
├─ union member
│  └─ {} must be undefined
├─ union member
│  └─ {} must be equal to null
└─ union member
   └─ {} must be a number`
    )
  })

  it("fromNullable. encoder", () => {
    const schema = _.fromNullable(S.number)
    Util.expectEncodingSuccess(schema, O.none, null)
  })

  it("option. Pretty", () => {
    const schema = _.option(S.number)
    const pretty = Pretty.pretty(schema)
    expect(pretty(O.none)).toEqual("none")
    expect(pretty(O.some(1))).toEqual("some(1)")
  })
})
