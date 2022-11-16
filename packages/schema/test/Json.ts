import * as A from "@fp-ts/codec/Arbitrary"
import * as Json from "@fp-ts/codec/data/Json"
import * as G from "@fp-ts/codec/Guard"
import * as T from "@fp-ts/codec/internal/These"
import * as JC from "@fp-ts/codec/JsonCodec"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import * as fc from "fast-check"

describe("Json", () => {
  it("Json", () => {
    const schema = Json.Schema
    const arbitrary = A.unsafeArbitraryFor(schema)
    const guard = G.unsafeGuardFor(schema)
    const decoder = JC.JsonCodec.unsafeDecoderFor(schema)
    fc.assert(fc.property(arbitrary.arbitrary(fc), (json) => {
      guard.is(json) && T.isRight(decoder.decode(json))
    }))
  })

  it("Show", () => {
    const schema = Json.Schema
    const manualSchema: S.Schema<Json.Json> = S.lazy<Json.Json>(() =>
      S.union(
        S.of(null),
        S.string,
        S.number,
        S.boolean,
        S.array(true, manualSchema),
        S.indexSignature(manualSchema)
      )
    )
    const show = Sh.unsafeShowFor(schema)
    const manualShow = Sh.unsafeShowFor(manualSchema)
    const json: Json.Json = { a: [1, null] }
    expect(show.show(json)).toEqual(manualShow.show(json))
  })
})
