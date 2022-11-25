import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import * as Json from "@fp-ts/schema/data/Json"
import * as G from "@fp-ts/schema/Guard"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as S from "@fp-ts/schema/Schema"
import * as show from "@fp-ts/schema/Show"
import * as fc from "fast-check"

const unsafeGuardFor = G.provideUnsafeGuardFor(Json.Provider)
const unsafeArbitraryFor = A.provideUnsafeArbitraryFor(Json.Provider)
const unsafeShowFor = show.provideUnsafeShowFor(Json.Provider)
const unsafeJsonDecoderFor = JD.provideUnsafeJsonDecoderFor(Json.Provider)

describe("Json", () => {
  it("Json", () => {
    const schema = Json.Schema
    const arbitrary = unsafeArbitraryFor(schema)
    const guard = unsafeGuardFor(schema)
    const decoder = unsafeJsonDecoderFor(schema)
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
        S.array(manualSchema),
        S.indexSignature(manualSchema)
      )
    )
    const jsonShow = unsafeShowFor(schema)
    const manualJsonShow = unsafeShowFor(manualSchema)
    const json: Json.Json = { a: [1, null] }
    expect(jsonShow.show(json)).toEqual(manualJsonShow.show(json))
  })
})
