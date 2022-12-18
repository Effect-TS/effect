import { pipe } from "@fp-ts/data/Function"
import { filter } from "@fp-ts/schema/data/filter"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("filter", () => {
  it("struct", () => {
    const struct = S.struct({
      a: S.number,
      b: S.number
    })

    const aEqualb = filter(
      Symbol.for("@fp-ts/schema/test/aEqualb"),
      (a: { a: unknown; b: unknown }) =>
        a.a === a.b ? D.success(a) : D.failure(DE.custom("a !== b", a))
    )

    const schema = pipe(struct, aEqualb)

    const guard = G.guardFor(schema)
    expect(guard.is({ a: 1, b: 1 })).toEqual(true)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(false)
    expect(guard.is({ a: 1 })).toEqual(false)
    expect(guard.is({ a: 1, b: 2 })).toEqual(false)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode({ a: 1, b: 1 })).toEqual(D.success({ a: 1, b: 1 }))
    Util.expectFailure(
      decoder,
      { a: 1, b: 2 },
      "{\"a\":1,\"b\":2} \"a !== b\""
    )
  })
})
