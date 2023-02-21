/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as D from "@fp-ts/schema/data/Date"
import * as I from "@fp-ts/schema/internal/common"
import * as PR from "@fp-ts/schema/ParseResult"
import type { AnnotationOptions, Schema } from "@fp-ts/schema/Schema"

const trimmedRegex = /^\S.*\S$|^\S$|^$/

/**
 * Verifies that a string contains no leading or trailing whitespaces.
 *
 * Note. This combinator does not make any transformations, it only validates.
 * If what you were looking for was a combinator to trim strings, then check out the `trim` combinator.
 *
 * @since 1.0.0
 */
export const trimmed = <A extends string>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => trimmedRegex.test(a), {
        description: "a string with no leading or trailing whitespace",
        custom: { type: "trimmed" },
        jsonSchema: {
          type: "string",
          pattern: trimmedRegex.source
        },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const maxLength = <A extends string>(
  maxLength: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.length <= maxLength,
        {
          description: `a string at most ${maxLength} character(s) long`,
          jsonSchema: { maxLength },
          ...annotationOptions
        }
      )
    )

/**
 * @since 1.0.0
 */
export const minLength = <A extends string>(
  minLength: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.length >= minLength,
        {
          description: `a string at least ${minLength} character(s) long`,
          jsonSchema: { minLength },
          ...annotationOptions
        }
      )
    )

/**
 * @since 1.0.0
 */
export const pattern = <A extends string>(
  regex: RegExp,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> => {
    const pattern = regex.source
    return pipe(
      self,
      I.filter(
        (a): a is A => {
          // The following line ensures that `lastIndex` is reset to `0` in case the user has specified the `g` flag
          regex.lastIndex = 0
          return regex.test(a)
        },
        {
          description: `a string matching the pattern ${pattern}`,
          jsonSchema: { pattern },
          custom: { type: "pattern", regex },
          ...annotationOptions
        }
      )
    )
  }

/**
 * @since 1.0.0
 */
export const startsWith = <A extends string>(
  startsWith: string,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.startsWith(startsWith),
        {
          description: `a string starting with ${JSON.stringify(startsWith)}`,
          jsonSchema: { pattern: `^${startsWith}` },
          custom: { type: "startsWith", startsWith },
          ...annotationOptions
        }
      )
    )

/**
 * @since 1.0.0
 */
export const endsWith = <A extends string>(
  endsWith: string,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.endsWith(endsWith),
        {
          description: `a string ending with ${JSON.stringify(endsWith)}`,
          jsonSchema: { pattern: `^.*${endsWith}$` },
          custom: { type: "endsWith", endsWith },
          ...annotationOptions
        }
      )
    )

/**
 * @since 1.0.0
 */
export const includes = <A extends string>(
  searchString: string,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.includes(searchString),
        {
          description: `a string including ${JSON.stringify(searchString)}`,
          jsonSchema: { pattern: `.*${searchString}.*` },
          custom: { type: "includes", includes: searchString },
          ...annotationOptions
        }
      )
    )

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
      pipe(self, trimmed()),
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
