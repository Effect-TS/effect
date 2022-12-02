import * as A from "@fp-ts/schema/Arbitrary"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JC from "@fp-ts/schema/JsonCodec"
import type { Schema } from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  const jsonCodec = JC.jsonCodecFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (json) => {
    return guard.is(json) && !D.isFailure(jsonCodec.decode(jsonCodec.encode(json)))
  }))
}
