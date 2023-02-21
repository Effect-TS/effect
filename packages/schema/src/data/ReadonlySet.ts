/**
 * @since 1.0.0
 */
import { pipe } from "@effect/data/Function"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const isSet = (u: unknown): u is Set<unknown> => u instanceof Set

const parser = <A>(item: P.Parser<A>): P.Parser<ReadonlySet<A>> => {
  const items = P.decode(I.array(item))
  const schema = readonlySet(item)
  return I.makeParser(
    schema,
    (u, options) =>
      !isSet(u) ?
        PR.failure(PR.type(schema.ast, u)) :
        pipe(
          Array.from(u.values()),
          (us) => items(us, options),
          I.map((as) => new Set(as))
        )
  )
}

const arbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> =>
  I.makeArbitrary(readonlySet(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

const pretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
  I.makePretty(
    readonlySet(item),
    (set) => `new Set([${Array.from(set.values()).map((a) => item.pretty(a)).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const readonlySet = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  I.typeAlias(
    [item],
    I.struct({
      size: I.number
    }),
    {
      [IdentifierId]: "ReadonlySet",
      [H.ParserHookId]: H.hook(parser),
      [H.PrettyHookId]: H.hook(pretty),
      [H.ArbitraryHookId]: H.hook(arbitrary)
    }
  )

/**
 * @since 1.0.0
 */
export const fromValues = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  pipe(I.array(item), I.transform(readonlySet(item), (as) => new Set(as), (set) => Array.from(set)))
