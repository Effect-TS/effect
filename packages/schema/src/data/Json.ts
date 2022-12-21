/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
import { arbitraryAnnotation } from "@fp-ts/schema/annotation/ArbitraryAnnotation"
import { decoderAnnotation } from "@fp-ts/schema/annotation/DecoderAnnotation"
import { encoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import { guardAnnotation } from "@fp-ts/schema/annotation/GuardAnnotation"
import { prettyAnnotation } from "@fp-ts/schema/annotation/PrettyAnnotation"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type * as S from "@fp-ts/schema/Schema"

const JsonSchema: S.Schema<Json> = I.lazy(() =>
  I.union(
    I.literal(null),
    I.string,
    I.number,
    I.boolean,
    I.array(JsonSchema),
    I.stringIndexSignature(JsonSchema)
  )
)

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<Json> = I.typeAlias([], JsonSchema, [
  decoderAnnotation(() => Decoder),
  guardAnnotation(() => Guard),
  encoderAnnotation(() => Encoder),
  prettyAnnotation(() => Pretty),
  arbitraryAnnotation(() => Arbitrary)
])

const Guard = I.makeGuard<Json>(Schema, I.isJson)

const Decoder = I.fromRefinement<Json>(Schema, I.isJson, (u) => DE.type("Json", u))

const Encoder = I.makeEncoder<unknown, Json>(Schema, identity)

const Arbitrary = I.makeArbitrary<Json>(Schema, (fc) => fc.jsonValue().map((json) => json as Json))

const Pretty = I.makePretty<Json>(Schema, (json) => JSON.stringify(json))
