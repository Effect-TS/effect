/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as D from "@fp-ts/schema/data/Date"
import * as F from "@fp-ts/schema/data/filter"
import * as I from "@fp-ts/schema/internal/common"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Schema } from "@fp-ts/schema/Schema"

/**
  Transforms a `string` into a `number` by parsing the string using `parseFloat`.

  The following special string values are supported: "NaN", "Infinity", "-Infinity".

  @since 1.0.0
*/
export const parseNumber = (self: Schema<string>): Schema<number> => {
  const schema: Schema<number> = pipe(
    self,
    I.transformOrFail(
      I.number,
      (s) => {
        if (s === "NaN") {
          return PR.success(NaN)
        }
        if (s === "Infinity") {
          return PR.success(Infinity)
        }
        if (s === "-Infinity") {
          return PR.success(-Infinity)
        }
        const n = parseFloat(s)
        return isNaN(n) ? PR.failure(PR.type(schema.ast, s)) : PR.success(n)
      },
      (n) => PR.success(String(n))
    )
  )
  return schema
}

/**
 * The `trim` parser allows removing whitespaces from the beginning and end of a string.
 *
 * @since 1.0.0
 */
export const trim = (self: Schema<string>): Schema<string> =>
  pipe(
    self,
    I.transform(
      pipe(self, F.trimmed()),
      (s) => s.trim(),
      (s) => s.trim()
    )
  )

/**
  Transforms a `string` into a `Date` by parsing the string using `Date.parse`.

  @since 1.0.0
*/
export const parseDate = (self: Schema<string>): Schema<Date> => {
  const schema: Schema<Date> = pipe(
    self,
    I.transformOrFail(
      D.date,
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
