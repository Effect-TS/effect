/**
 * @since 1.0.0
 */
import { pipe } from "@effect/data/Function"
import { isDate } from "@effect/data/Predicate"
import { IdentifierId } from "@effect/schema/annotation/AST"
import * as H from "@effect/schema/annotation/Hook"
import type { Arbitrary } from "@effect/schema/Arbitrary"
import * as I from "@effect/schema/internal/common"
import type * as P from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import type { Pretty } from "@effect/schema/Pretty"
import type { Schema } from "@effect/schema/Schema"

const parser = (): P.Parser<Date> =>
  I.makeParser(date, (u) => !isDate(u) ? PR.failure(PR.type(date.ast, u)) : PR.success(u))

const arbitrary = (): Arbitrary<Date> => I.makeArbitrary(date, (fc) => fc.date())

const pretty = (): Pretty<Date> => I.makePretty(date, (date) => `new Date(${JSON.stringify(date)})`)

/**
 * @since 1.0.0
 */
export const date: Schema<Date> = I.typeAlias([], I.struct({}), {
  [IdentifierId]: "Date",
  [H.ParserHookId]: H.hook(parser),
  [H.PrettyHookId]: H.hook(pretty),
  [H.ArbitraryHookId]: H.hook(arbitrary)
})

/**
  Transforms a `string` into a `Date` by parsing the string using `Date.parse`.

  @since 1.0.0
*/
export const parseString = (self: Schema<string>): Schema<Date> => {
  const schema: Schema<Date> = pipe(
    self,
    I.transformOrFail(
      date,
      (s) => {
        const n = Date.parse(s)
        return isNaN(n)
          ? PR.failure(PR.type(schema.ast, s))
          : PR.success(new Date(n))
      },
      (n) => PR.success(n.toISOString())
    )
  )
  return schema
}
