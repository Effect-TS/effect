/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as UD from "@fp-ts/schema/UnknownDecoder"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/ReadonlySet")

/**
 * @since 1.0.0
 */
export const guard = <A>(item: G.Guard<A>): G.Guard<ReadonlySet<A>> =>
  G.make(
    schema(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

/**
 * @since 1.0.0
 */
export const unknownDecoder = <A>(item: UD.UnknownDecoder<A>): UD.UnknownDecoder<ReadonlySet<A>> =>
  I.makeDecoder(
    schema(item),
    (i) => pipe(UD.unknownDecoderFor(S.array(item)).decode(i), T.map((as) => new Set(as)))
  )

/**
 * @since 1.0.0
 */
export const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<ReadonlySet<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.UnknownDecoderId]: unknownDecoder,
  [I.JsonDecoderId]: unknownDecoder
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: S.Schema<A>): S.Schema<ReadonlySet<A>> =>
  S.declare(id, O.none, Provider, item)
