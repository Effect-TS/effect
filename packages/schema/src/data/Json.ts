/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import type { Json } from "@fp-ts/data/Json"
import {
  arbitraryAnnotation,
  ArbitraryAnnotationId
} from "@fp-ts/schema/annotation/ArbitraryAnnotation"
import { decoderAnnotation, DecoderAnnotationId } from "@fp-ts/schema/annotation/DecoderAnnotation"
import { encoderAnnotation, EncoderAnnotationId } from "@fp-ts/schema/annotation/EncoderAnnotation"
import { guardAnnotation, GuardAnnotationId } from "@fp-ts/schema/annotation/GuardAnnotation"
import { prettyAnnotation, PrettyAnnotationId } from "@fp-ts/schema/annotation/PrettyAnnotation"
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
    I.record(I.string, JsonSchema)
  )
)

/**
 * @since 1.0.0
 */
export const json: S.Schema<Json> = I.typeAlias([], JsonSchema, {
  [DecoderAnnotationId]: decoderAnnotation(() => Decoder),
  [GuardAnnotationId]: guardAnnotation(() => Guard),
  [EncoderAnnotationId]: encoderAnnotation(() => Encoder),
  [PrettyAnnotationId]: prettyAnnotation(() => Pretty),
  [ArbitraryAnnotationId]: arbitraryAnnotation(() => Arbitrary)
})

const Guard = I.makeGuard<Json>(json, I.isJson)

const Decoder = I.fromRefinement<Json>(json, I.isJson, (u) => DE.type("Json", u))

const Encoder = I.makeEncoder<unknown, Json>(json, identity)

const Arbitrary = I.makeArbitrary<Json>(json, (fc) => fc.jsonValue().map((json) => json as Json))

const Pretty = I.makePretty<Json>(json, (json) => JSON.stringify(json))
