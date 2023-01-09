/**
 * @since 1.0.0
 */
import type { Chunk } from "@fp-ts/data/Chunk"
import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/HookAnnotation"
import * as A from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const decoder = <A>(item: D.Decoder<unknown, A>): D.Decoder<unknown, Chunk<A>> => {
  const items = D.decode(I.array(item))
  return I.makeDecoder(
    chunk(item),
    (u, options) =>
      !C.isChunk(u) ?
        DE.failure(DE.type("Chunk<unknown>", u)) :
        pipe(C.toReadonlyArray(u), (us) => items(us, options), I.map(C.fromIterable))
  )
}

const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<Chunk<A>> =>
  A.make(chunk(item), (fc) => fc.array(item.arbitrary(fc)).map(C.fromIterable))

const pretty = <A>(item: P.Pretty<A>): P.Pretty<Chunk<A>> =>
  P.make(
    chunk(item),
    (c) => `Chunk(${C.toReadonlyArray(c).map(item.pretty).join(", ")})`
  )

/**
 * @since 1.0.0
 */
export const chunk = <A>(item: Schema<A>): Schema<Chunk<A>> =>
  I.typeAlias(
    [item],
    I.struct({
      _id: I.uniqueSymbol(Symbol.for("@fp-ts/data/Chunk")),
      length: I.number
    }),
    {
      [H.DecoderHookId]: H.hook(decoder),
      [H.PrettyHookId]: H.hook(pretty),
      [H.ArbitraryHookId]: H.hook(arbitrary)
    }
  )

/**
 * @since 1.0.0
 */
export const fromValues = <A>(item: Schema<A>): Schema<Chunk<A>> =>
  pipe(I.array(item), I.transform(chunk(item), C.fromIterable, C.toReadonlyArray))
