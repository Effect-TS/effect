/**
 * @since 1.0.0
 */
import { isDate } from "@fp-ts/core/Predicate"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import type * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

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
