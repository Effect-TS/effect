import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import { decoderAnnotation } from "@fp-ts/schema/annotation/DecoderAnnotation"
import { encoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import { make } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/data/Option")

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
export const Provider = make(id, {
  [I.PrettyId]: pretty
})

/**
 * @since 1.0.0
 */
export const schema = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.typeAlias(
    id,
    O.none,
    Provider,
    [value],
    I.union(
      I.struct({ _tag: I.literal("None") }),
      I.struct({ _tag: I.literal("Some"), value })
    ),
    [
      decoderAnnotation(null, (_, item) => decoder(item)),
      encoderAnnotation(null, (_, item) => encoder(item))
    ]
  )
