/**
 * @since 1.0.0
 */
import type { Chunk } from "@effect/data/Chunk"
import * as C from "@effect/data/Chunk"
import { pipe } from "@fp-ts/core/Function"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as A from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const parser = <A>(item: P.Parser<A>): P.Parser<Chunk<A>> => {
  const items = P.decode(I.array(item))
  const schema = chunk(item)
  return I.makeParser(
    schema,
    (u, options) =>
      !C.isChunk(u) ?
        PR.failure(PR.type(schema.ast, u)) :
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
    [item],
    I.struct({
      _id: I.uniqueSymbol(Symbol.for("@fp-ts/core/Chunk")),
      length: I.number
    }),
    {
      [IdentifierId]: "Chunk",
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
