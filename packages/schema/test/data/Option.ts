import * as O from "@fp-ts/data/Option"
import * as _ from "@fp-ts/schema/data/Option"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Option", () => {
  it("fromNullable. property tests", () => {
    Util.property(_.fromNullable(S.number))
  })

  it("option. guard. direct", () => {
    const schema = _.option(S.number)
    const guard = G.guardFor(schema)
    expect(guard.is(O.none)).toEqual(true)
    expect(guard.is(O.some(1))).toEqual(true)
    expect(guard.is(O.some("a"))).toEqual(false)
  })

  it("fromNullable. decoder", () => {
    const schema = _.fromNullable(S.number)
    Util.expectDecodingSuccess(schema, undefined, O.none)
    Util.expectDecodingSuccess(schema, null, O.none)
    Util.expectDecodingSuccess(schema, 1, O.some(1))

    Util.expectFailureTree(
      schema,
      {},
      `3 error(s) found
├─ union member
│  └─ {} did not satisfy is(undefined)
├─ union member
│  └─ {} did not satisfy isEqual(null)
└─ union member
   └─ {} did not satisfy is(number)`
    )
  })

  it("fromNullable. encoder", () => {
    const schema = _.fromNullable(S.number)
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, O.none, null)
  })

  it("option. Pretty", () => {
    const schema = _.option(S.number)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(O.none)).toEqual("none")
    expect(pretty.pretty(O.some(1))).toEqual("some(1)")
  })
})
