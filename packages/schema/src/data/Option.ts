/**
 * @since 1.0.0
 */
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import type { Option } from "@effect/data/Option"
import * as O from "@effect/data/Option"
import { IdentifierId } from "@effect/schema/annotation/AST"
import * as H from "@effect/schema/annotation/Hook"
import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as I from "@effect/schema/internal/common"
import * as P from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import type { Pretty } from "@effect/schema/Pretty"
import type { Infer, Schema, Spread } from "@effect/schema/Schema"

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
export const parseNullable = <A>(value: Schema<A>): Schema<Option<A>> =>
  pipe(
    I.union(I._undefined, I.nullable(value)),
    I.transform(option(value), O.fromNullable, O.getOrNull)
  )

/**
 * @since 1.0.0
 */
export const parseOptionals = <Fields extends Record<PropertyKey, Schema<any>>>(
  fields: Fields
) =>
  <A extends object>(
    schema: Schema<A>
  ): Schema<Spread<A & { readonly [K in keyof Fields]: Option<Infer<Fields[K]>> }>> => {
    if (AST.isTypeLiteral(schema.ast)) {
      const propertySignatures = schema.ast.propertySignatures
      const ownKeys = Reflect.ownKeys(fields)
      const from = AST.createTypeLiteral(
        propertySignatures.concat(
          ownKeys.map((key) =>
            AST.createPropertySignature(
              key,
              AST.createUnion([I._undefined.ast, I._null.ast, fields[key].ast]),
              true,
              true
            )
          )
        ),
        schema.ast.indexSignatures
      )
      const to = AST.createTypeLiteral(
        propertySignatures.concat(
          ownKeys.map((key) =>
            AST.createPropertySignature(
              key,
              option(fields[key]).ast,
              true,
              true
            )
          )
        ),
        schema.ast.indexSignatures
      )
      const out = AST.createTransform(from, to, (o: any) => {
        const out = { ...o }
        for (const key of ownKeys) {
          out[key] = O.fromNullable(o[key])
        }
        return PR.success(out)
      }, (o) => {
        const out = { ...o }
        for (const key of ownKeys) {
          if (O.isSome(o[key])) {
            out[key] = o[key].value
          } else {
            delete out[key]
          }
        }
        return PR.success(out)
      })
      return I.makeSchema(out)
    }
    throw new Error("`parseOptional` can only handle type literals")
  }
