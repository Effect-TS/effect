/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import type * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { JsonEncoder } from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Pretty"
import { make } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import type { UnknownDecoder } from "@fp-ts/schema/UnknownDecoder"
import * as UD from "@fp-ts/schema/UnknownDecoder"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/Option")

const guard = <A>(value: G.Guard<A>): G.Guard<Option<A>> =>
  I.makeGuard(
    schema(value),
    (u): u is Option<A> => O.isOption(u) && (O.isNone(u) || O.isSome(u) && value.is(u.value))
  )

const unknownDecoder = <A>(
  value: UnknownDecoder<A>
): UnknownDecoder<Option<A>> => {
  const decoder = UD.unknownDecoderFor(S.union(S.literal(null), value))
  return I.makeDecoder(
    schema(value),
    (i) => pipe(decoder.decode(i), T.map(O.fromNullable))
  )
}

const jsonEncoder = <A>(value: JsonEncoder<A>): JsonEncoder<Option<A>> =>
  I.makeEncoder(schema(value), (oa) => pipe(oa, O.map(value.encode), O.getOrNull))

const arbitrary = <A>(value: A.Arbitrary<A>): A.Arbitrary<Option<A>> =>
  A.arbitraryFor(S.union(
    S.struct({
      _tag: S.literal("None")
    }),
    S.struct({
      _tag: S.literal("Some"),
      value
    })
  ))

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
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.UnknownDecoderId]: unknownDecoder,
  [I.JsonDecoderId]: unknownDecoder,
  [I.UnknownEncoderId]: jsonEncoder,
  [I.JsonEncoderId]: jsonEncoder,
  [I.PrettyId]: pretty
})

/**
 * @since 1.0.0
 */
export const schema = <A>(value: S.Schema<A>): S.Schema<Option<A>> =>
  S.declare(id, O.none, Provider, value)
