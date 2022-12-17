/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/ReadonlySet")

const guard = <A>(item: Guard<A>): Guard<ReadonlySet<A>> =>
  I.makeGuard(
    schema(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

const decoder = <A>(item: Decoder<unknown, A>): Decoder<unknown, ReadonlySet<A>> =>
  I.makeDecoder(
    schema(item),
    (i) => pipe(D.decoderFor(I.array(item)).decode(i), T.map((as) => new Set(as)))
  )

const encoder = <A>(item: Encoder<unknown, A>): Encoder<unknown, ReadonlySet<A>> =>
  I.makeEncoder(schema(item), (set) => Array.from(set).map(item.encode))

const arbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> =>
  I.makeArbitrary(schema(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

const pretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
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
export const schema = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  I.typeAlias(
    id,
    O.none,
    Provider,
    [item],
    I.struct({})
  )
