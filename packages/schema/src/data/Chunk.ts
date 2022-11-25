/**
 * @since 1.0.0
 */
import type { Chunk } from "@fp-ts/data/Chunk"
import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as A from "@fp-ts/schema/Arbitrary"
import * as J from "@fp-ts/schema/data/Json"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as Sh from "@fp-ts/schema/Show"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/Chunk")

const guard = <A>(item: G.Guard<A>): G.Guard<Chunk<A>> =>
  I.makeGuard(
    schema(item),
    (u): u is Chunk<A> => C.isChunk(u) && C.toReadonlyArray(u).every(item.is)
  )

const fromArray = <I, A>(item: D.Decoder<I, A>): D.Decoder<ReadonlyArray<I>, Chunk<A>> =>
  pipe(D.fromArray(item), D.compose(D.make(schema(item), (as) => D.succeed(C.unsafeFromArray(as)))))

const decoder = <A>(item: D.Decoder<unknown, A>): D.Decoder<unknown, Chunk<A>> =>
  pipe(D.UnknownArray, D.compose(fromArray(item)))

const jsonDecoder = <A>(item: JD.JsonDecoder<A>): JD.JsonDecoder<Chunk<A>> =>
  pipe(JD.unsafeJsonDecoderFor(S.array(J.Schema)), D.compose(fromArray(item)))

const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<Chunk<A>> =>
  A.make(schema(item), (fc) => fc.array(item.arbitrary(fc)).map(C.unsafeFromArray))

const show = <A>(item: Sh.Show<A>): Sh.Show<Chunk<A>> =>
  Sh.make(
    schema(item),
    (chunk) => `chunk.unsafeFromArray([${C.toReadonlyArray(chunk).map(item.show).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [G.GuardId]: guard,
  [A.ArbitraryId]: arbitrary,
  [Sh.ShowId]: show,
  [D.DecoderId]: decoder,
  [JD.JsonDecoderId]: jsonDecoder
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: S.Schema<A>): S.Schema<Chunk<A>> =>
  S.declare(id, O.none, Provider, item)
