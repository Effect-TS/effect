/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import * as TH from "@fp-ts/schema/annotation/IdentifierAnnotation"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const decoder = <A>(
  value: Decoder<unknown, A>
): Decoder<unknown, Option<A>> => {
  const decoder = D.decoderFor(I.union(I._undefined, I._null, value))
  return I.makeDecoder(
    fromNullable(value),
    (i) => pipe(decoder.decode(i), T.map(O.fromNullable))
  )
}

const encoder = <A>(value: Encoder<unknown, A>): Encoder<unknown, Option<A>> =>
  I.makeEncoder(fromNullable(value), (oa) => pipe(oa, O.map(value.encode), O.getOrNull))

const pretty = <A>(value: P.Pretty<A>): P.Pretty<Option<A>> =>
  P.make(
    fromNullable(value),
    O.match(
      () => "none",
      (a) => `some(${value.pretty(a)})`
    )
  )

/**
 * @since 1.0.0
 */
export const inline = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.union(
    I.struct({ _tag: I.literal("None") }),
    I.struct({ _tag: I.literal("Some"), value })
  )

/**
 * @since 1.0.0
 */
export const plain = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.typeAlias([value], inline(value), {
    [H.PrettyTypeAliasHookId]: H.typeAliasHook(pretty),
    [TH.IdentifierAnnotationId]: TH.identifierAnnotation("Option")
  })

/**
 * @since 1.0.0
 */
export const fromNullable = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.typeAlias([value], inline(value), {
    [H.DecoderTypeAliasHookId]: H.typeAliasHook(decoder),
    [H.EncoderTypeAliasHookId]: H.typeAliasHook(encoder),
    [H.PrettyTypeAliasHookId]: H.typeAliasHook(pretty),
    [TH.IdentifierAnnotationId]: TH.identifierAnnotation("Option")
  })
