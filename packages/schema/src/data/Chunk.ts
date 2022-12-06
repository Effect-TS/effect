/**
 * @since 1.0.0
 */
import type { Chunk } from "@fp-ts/data/Chunk"
import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
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
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/Chunk")

const guard = <A>(item: G.Guard<A>): G.Guard<Chunk<A>> =>
  I.makeGuard(
    schema(item),
    (u): u is Chunk<A> => C.isChunk(u) && pipe(u, C.every(item.is))
  )

const decoder = <A>(
  item: Decoder<unknown, A>
): Decoder<unknown, Chunk<A>> =>
  I.makeDecoder(
    schema(item),
    (u) => pipe(D.decoderFor(S.array(item)).decode(u), T.map(C.unsafeFromArray))
  )

const encoder = <A>(item: Encoder<unknown, A>): Encoder<unknown, Chunk<A>> =>
  I.makeEncoder(schema(item), (chunk) => C.toReadonlyArray(chunk).map(item.encode))

const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<Chunk<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map(C.unsafeFromArray))

const pretty = <A>(item: P.Pretty<A>): P.Pretty<Chunk<A>> =>
  P.make(
    schema(item),
    (c) => `Chunk(${C.toReadonlyArray(c).map(item.pretty).join(", ")})`
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
export const schema = <A>(item: S.Schema<A>): S.Schema<Chunk<A>> =>
  S.declare(id, O.none, Provider, item)
