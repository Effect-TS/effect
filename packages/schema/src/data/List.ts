/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { List } from "@fp-ts/data/List"
import * as L from "@fp-ts/data/List"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import * as A from "@fp-ts/schema/Arbitrary"
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as D from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import { make } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/Chunk")

const guard = <A>(item: G.Guard<A>): G.Guard<List<A>> =>
  I.makeGuard(
    schema(item),
    (u): u is List<A> => L.isList(u) && pipe(u, L.every(item.is))
  )

const decoder = <A>(
  item: Decoder<unknown, A>
): Decoder<unknown, List<A>> =>
  I.makeDecoder(
    schema(item),
    (u) => pipe(D.decoderFor(I.array(item)).decode(u), T.map(L.fromIterable))
  )

const encoder = <A>(item: Encoder<unknown, A>): Encoder<unknown, List<A>> =>
  I.makeEncoder(schema(item), (list) => L.toReadonlyArray(list).map(item.encode))

const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<List<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map(L.fromIterable))

const pretty = <A>(item: P.Pretty<A>): P.Pretty<List<A>> =>
  P.make(
    schema(item),
    (c) => `List(${L.toReadonlyArray(c).map(item.pretty).join(", ")})`
  )

/**
 * @since 1.0.0
 */
export const Provider = make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.DecoderId]: decoder,
  [I.EncoderId]: encoder,
  [I.PrettyId]: pretty
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: Schema<A>): Schema<List<A>> =>
  I.declareSchema(id, O.none, Provider, item)
