import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import * as Json from "@fp-ts/schema/data/Json"
import * as G from "@fp-ts/schema/Guard"
import * as JC from "@fp-ts/schema/JsonCodec"
import * as fc from "fast-check"

describe("Json", () => {
  it("property tests", () => {
    const schema = Json.Schema
    const arbitrary = A.arbitraryFor(schema)
    const guard = G.guardFor(schema)
    const jsonCodec = JC.jsonCodecFor(schema)
    fc.assert(fc.property(arbitrary.arbitrary(fc), (json) => {
      guard.is(json) && T.isRight(jsonCodec.decode(jsonCodec.encode(json)))
    }))
  })
})
