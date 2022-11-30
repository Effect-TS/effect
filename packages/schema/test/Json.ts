import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import * as Json from "@fp-ts/schema/data/Json"
import * as G from "@fp-ts/schema/Guard"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as fc from "fast-check"

const guardFor = G.provideGuardFor(Json.Provider)
const arbitraryFor = A.provideArbitraryFor(Json.Provider)
const jsonDecoderFor = JD.provideJsonDecoderFor(Json.Provider)

describe("Json", () => {
  it("Json", () => {
    const schema = Json.Schema
    const arbitrary = arbitraryFor(schema)
    const guard = guardFor(schema)
    const decoder = jsonDecoderFor(schema)
    fc.assert(fc.property(arbitrary.arbitrary(fc), (json) => {
      guard.is(json) && T.isRight(decoder.decode(json))
    }))
  })
})
