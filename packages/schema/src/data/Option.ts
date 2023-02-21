/**
 * @since 1.0.0
 */
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import type { Option } from "@effect/data/Option"
import * as O from "@effect/data/Option"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import * as A from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const parser = <A>(value: P.Parser<A>): P.Parser<Option<A>> => {
  const schema = option(value)
  const decodeValue = P.decode(value)
  return I.makeParser(
    schema,
    (u, options) =>
      !O.isOption(u) ?
        PR.failure(PR.type(schema.ast, u)) :
        O.isNone(u) ?
        PR.success(O.none()) :
        pipe(decodeValue(u.value, options), I.map(O.some))
  )
}

const arbitrary = <A>(value: A.Arbitrary<A>): A.Arbitrary<Option<A>> => {
  const struct = A.arbitrary(inline(value))
  return A.make(
    option(value),
    (fc) => struct(fc).map(O.match(() => O.none(), (value) => O.some(value)))
  )
}

const pretty = <A>(value: Pretty<A>): Pretty<Option<A>> =>
  I.makePretty(
    option(value),
    O.match(
      () => "none()",
      (a) => `some(${value.pretty(a)})`
    )
  )

const inline = <A>(value: Schema<A>): Schema<Option<A>> =>
  I.union(
    I.struct({
      _tag: I.literal("None"),
      [Equal.symbol]: I.any,
      [Hash.symbol]: I.any
    }),
    I.struct({
      _tag: I.literal("Some"),
      value,
      [Equal.symbol]: I.any,
      [Hash.symbol]: I.any
    })
  )

/**
 * @since 1.0.0
 */
export const option = <A>(value: Schema<A>): Schema<Option<A>> => {
  return I.typeAlias(
    [value],
    inline(value),
    {
      [IdentifierId]: "Option",
      [H.ParserHookId]: H.hook(parser),
      [H.PrettyHookId]: H.hook(pretty),
      [H.ArbitraryHookId]: H.hook(arbitrary)
    }
  )
}

/**
 * @since 1.0.0
 */
export const fromNullable = <A>(value: Schema<A>): Schema<Option<A>> =>
  pipe(
    I.union(I._undefined, I.nullable(value)),
    I.transform(option(value), O.fromNullable, O.getOrNull)
  )
