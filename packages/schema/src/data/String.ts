/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as H from "@effect/schema/annotation/Hook"
import * as I from "@effect/schema/internal/common"
import type { AnnotationOptions, Schema } from "@effect/schema/Schema"

/**
 * @since 1.0.0
 */
export const TrimmedTypeId = "@effect/schema/data/String/TrimmedTypeId"

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
        typeId: TrimmedTypeId,
        description: "a string with no leading or trailing whitespace",
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
export const PatternTypeId = "@effect/schema/data/String/PatternTypeId"

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
          typeId: { id: PatternTypeId, params: { regex } },
          description: `a string matching the pattern ${pattern}`,
          jsonSchema: { pattern },
          ...annotationOptions
        }
      )
    )
  }

/**
 * @since 1.0.0
 */
export const StartsWithTypeId = "@effect/schema/data/String/StartsWithTypeId"

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
          typeId: { id: StartsWithTypeId, params: { startsWith } },
          description: `a string starting with ${JSON.stringify(startsWith)}`,
          jsonSchema: { pattern: `^${startsWith}` },
          ...annotationOptions
        }
      )
    )

/**
 * @since 1.0.0
 */
export const EndsWithTypeId = "@effect/schema/data/String/EndsWithTypeId"

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
          typeId: { id: EndsWithTypeId, params: { endsWith } },
          description: `a string ending with ${JSON.stringify(endsWith)}`,
          jsonSchema: { pattern: `^.*${endsWith}$` },
          ...annotationOptions
        }
      )
    )

/**
 * @since 1.0.0
 */
export const IncludesTypeId = "@effect/schema/data/String/IncludesTypeId"

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
          typeId: { id: IncludesTypeId, params: { includes: searchString } },
          description: `a string including ${JSON.stringify(searchString)}`,
          jsonSchema: { pattern: `.*${searchString}.*` },
          ...annotationOptions
        }
      )
    )

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
 * @since 1.0.0
 */
export const UUIDTypeId = "@effect/schema/data/String/UUIDTypeId"

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

/**
 * @since 1.0.0
 */
export const UUID: Schema<string> = pipe(
  I.string,
  pattern(uuidRegex, {
    typeId: UUIDTypeId
  }),
  I.annotations({
    [H.ArbitraryHookId]: H.hook(() => I.makeArbitrary(UUID, (fc) => fc.uuid()))
  })
)
