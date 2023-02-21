/**
 * @since 1.0.0
 */
import type { Either } from "@effect/data/Either"
import * as E from "@effect/data/Either"
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as A from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const parser = <E, A>(left: P.Parser<E>, right: P.Parser<A>): P.Parser<Either<E, A>> => {
  const schema = either(left, right)
  const decodeLeft = P.decode(left)
  const decodeRight = P.decode(right)
  return I.makeParser(
    schema,
    (u, options) =>
      !E.isEither(u) ?
        PR.failure(PR.type(schema.ast, u)) :
        E.isLeft(u) ?
        pipe(decodeLeft(u.left, options), I.map(E.left)) :
        pipe(decodeRight(u.right, options), I.map(E.right))
  )
}

const arbitrary = <E, A>(
  left: A.Arbitrary<E>,
  right: A.Arbitrary<A>
): A.Arbitrary<Either<E, A>> => {
  const struct = A.arbitrary(inline(left, right))
  return A.make(
    either(left, right),
    (fc) => struct(fc).map(E.match((e) => E.left(e), (a) => E.right(a)))
  )
}

const pretty = <E, A>(
  left: Pretty<E>,
  right: Pretty<A>
): Pretty<Either<E, A>> =>
  I.makePretty(
    either(left, right),
    E.match(
      (e) => `left(${left.pretty(e)})`,
      (a) => `right(${right.pretty(a)})`
    )
  )

const inline = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  I.union(
    I.struct({
      _tag: I.literal("Left"),
      left,
      [Equal.symbol]: I.any,
      [Hash.symbol]: I.any
    }),
    I.struct({
      _tag: I.literal("Right"),
      right,
      [Equal.symbol]: I.any,
      [Hash.symbol]: I.any
    })
  )

/**
 * @since 1.0.0
 */
export const either = <E, A>(
  left: Schema<E>,
  right: Schema<A>
): Schema<Either<E, A>> =>
  I.typeAlias([left, right], inline(left, right), {
    [IdentifierId]: "Either",
    [H.ParserHookId]: H.hook(parser),
    [H.PrettyHookId]: H.hook(pretty),
    [H.ArbitraryHookId]: H.hook(arbitrary)
  })
