import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import { decoderAnnotation } from "@fp-ts/schema/annotation/DecoderAnnotation"
import { encoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import { identifierAnnotation } from "@fp-ts/schema/annotation/IdentifierAnnotation"
import { prettyAnnotation } from "@fp-ts/schema/annotation/PrettyAnnotation"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const decoder = <A>(
  value: Decoder<unknown, A>
): Decoder<unknown, Option<A>> => {
  const decoder = D.decoderFor(I.union(I.literal(null), value))
  return I.makeDecoder(
    schema(value),
    (i) => pipe(decoder.decode(i), T.map(O.fromNullable))
  )
}

const encoder = <A>(value: Encoder<unknown, A>): Encoder<unknown, Option<A>> =>
  I.makeEncoder(schema(value), (oa) => pipe(oa, O.map(value.encode), O.getOrNull))

const pretty = <A>(value: P.Pretty<A>): P.Pretty<Option<A>> =>
  P.make(
    schema(value),
    O.match(
      () => "none",
      (a) => `some(${value.pretty(a)})`
    )
  )

/**
 * @since 1.0.0
 */
export const schema = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.typeAlias(
    [value],
    I.union(
      I.struct({ _tag: I.literal("None") }),
      I.struct({ _tag: I.literal("Some"), value })
    ),
    [
      decoderAnnotation(decoder),
      encoderAnnotation(encoder),
      prettyAnnotation(pretty),
      identifierAnnotation("Option")
    ]
  )
