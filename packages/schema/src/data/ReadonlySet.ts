/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

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
export const decoder = <A>(item: Decoder<unknown, A>): Decoder<unknown, ReadonlySet<A>> =>
  I.makeDecoder(
    schema(item),
    (i) => pipe(D.decoderFor(S.array(item)).decode(i), T.map((as) => new Set(as)))
  )

const encoder = <A>(item: Encoder<unknown, A>): Encoder<unknown, ReadonlySet<A>> =>
  I.makeEncoder(schema(item), (set) => Array.from(set).map(item.encode))

/**
 * @since 1.0.0
 */
export const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<ReadonlySet<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

/**
 * @since 1.0.0
 */
export const pretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
  I.makePretty(
    schema(item),
    (set) => `new Set([${Array.from(set.values()).map((a) => item.pretty(a)).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.DecoderId]: decoder,
  [I.EncoderId]: encoder,
  [I.PrettyId]: pretty
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: S.Schema<A>): S.Schema<ReadonlySet<A>> =>
  S.declare(id, O.none, Provider, item)
