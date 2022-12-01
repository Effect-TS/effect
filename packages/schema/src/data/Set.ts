/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as A from "@fp-ts/schema/Arbitrary"
import * as JA from "@fp-ts/schema/data/JsonArray"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/Set")

const guard = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    schema(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

const fromArray = <I, A>(item: D.Decoder<I, A>): D.Decoder<ReadonlyArray<I>, Set<A>> =>
  pipe(D.fromArray(item), D.compose(D.make(schema(item), (as) => D.succeed(new Set(as)))))

const decoder = <A>(item: D.Decoder<unknown, A>): D.Decoder<unknown, Set<A>> =>
  pipe(D.UnknownArray, D.compose(fromArray(item)))

const jsonDecoder = <A>(item: JD.JsonDecoder<A>): JD.JsonDecoder<Set<A>> =>
  pipe(JD.jsonDecoderFor(JA.Schema), D.compose(fromArray(item)))

const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<Set<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.DecoderId]: decoder,
  [I.JsonDecoderId]: jsonDecoder
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.declare(id, O.none, Provider, item)
