/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Arbitrary"
import * as J from "@fp-ts/codec/data/Json"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import type * as JC from "@fp-ts/codec/JsonCodec"
import * as P from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/Set")

/**
 * @since 1.0.0
 */
export const guard = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    schema(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

/**
 * @since 1.0.0
 */
export const fromArray = <I, A>(item: D.Decoder<I, A>): D.Decoder<ReadonlyArray<I>, Set<A>> =>
  pipe(D.fromArray(item), D.compose(D.make(schema(item), (as) => D.succeed(new Set(as)))))

/**
 * @since 1.0.0
 */
export const decoder = <A>(item: D.Decoder<unknown, A>): D.Decoder<unknown, Set<A>> =>
  pipe(D.UnknownArray, D.compose(fromArray(item)))

/**
 * @since 1.0.0
 */
export const jsonDecoder = <A>(item: JC.JsonDecoder<A>): JC.JsonDecoder<Set<A>> =>
  pipe(J.JsonArrayJsonDecoder, D.compose(fromArray(item)))

/**
 * @since 1.0.0
 */
export const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<Set<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

/**
 * @since 1.0.0
 */
export const show = <A>(item: Sh.Show<A>): Sh.Show<Set<A>> =>
  Sh.make(schema(item), (set) => `Set([${Array.from(set.values()).map(item.show).join(", ")}])`)

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.ShowId]: show,
  [I.JsonDecoderId]: jsonDecoder
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.declare(id, O.none, Provider, item)
