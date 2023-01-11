/**
 * @since 1.0.0
 */
import type { Chunk } from "@fp-ts/data/Chunk"
import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/HookAnnotation"
import * as A from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import * as PE from "@fp-ts/schema/ParseError"
import * as P from "@fp-ts/schema/Parser"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const parser = <A>(item: P.Parser<unknown, A>): P.Parser<unknown, Chunk<A>> => {
  const items = P.decode(I.array(item))
  const schema = chunk(item)
  return I.makeParser(
    schema,
    (u, options) =>
      !C.isChunk(u) ?
        PE.failure(PE.type(schema.ast, u)) :
        pipe(C.toReadonlyArray(u), (us) => items(us, options), I.map(C.fromIterable))
  )
}

const arbitrary = <A>(item: A.Arbitrary<A>): A.Arbitrary<Chunk<A>> =>
  A.make(chunk(item), (fc) => fc.array(item.arbitrary(fc)).map(C.fromIterable))

const pretty = <A>(item: Pretty<A>): Pretty<Chunk<A>> =>
  I.makePretty(
    chunk(item),
    (c) => `Chunk(${C.toReadonlyArray(c).map(item.pretty).join(", ")})`
  )

/**
 * @since 1.0.0
 */
export const chunk = <A>(item: Schema<A>): Schema<Chunk<A>> =>
  I.typeAlias(
    "Chunk",
    [item],
    I.struct({
      _id: I.uniqueSymbol(Symbol.for("@fp-ts/data/Chunk")),
      length: I.number
    }),
    {
      [H.ParserHookId]: H.hook(parser),
      [H.PrettyHookId]: H.hook(pretty),
      [H.ArbitraryHookId]: H.hook(arbitrary)
    }
  )

/**
 * @since 1.0.0
 */
export const fromValues = <A>(item: Schema<A>): Schema<Chunk<A>> =>
  pipe(I.array(item), I.transform(chunk(item), C.fromIterable, C.toReadonlyArray))
