/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import { JSONSchemaId } from "@fp-ts/schema/annotation/AST"
import type { Annotated } from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const finite = <A extends number>(self: Schema<A>): Schema<A> =>
  pipe(
    self,
    I.filter((a): a is A => Number.isFinite(a), "a finite number", { type: "finite" })
  )

/**
 * @since 1.0.0
 */
export const greaterThan = (min: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a > min, `a number greater than ${min}`, { exclusiveMinimum: min }, {
        [JSONSchemaId]: { exclusiveMinimum: min }
      })
    )

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = (min: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a >= min, `a number greater than or equal to ${min}`, {
        minimum: min
      }, {
        [JSONSchemaId]: { minimum: min }
      })
    )

/**
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(constructor: A) =>
  (self: Schema<object>): Schema<InstanceType<A>> =>
    pipe(
      self,
      I.filter(
        (a): a is InstanceType<A> => a instanceof constructor,
        `an instance of ${constructor.name}`,
        { instanceof: constructor }
      )
    )

/**
 * @since 1.0.0
 */
export const int = <A extends number>(self: Schema<A>): Schema<A> =>
  pipe(
    self,
    I.filter((a): a is A => Number.isInteger(a), "integer", { type: "integer" }, {
      [JSONSchemaId]: { type: "integer" }
    })
  )

/**
 * @since 1.0.0
 */
export const lessThan = (max: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a < max, `a number less than ${max}`, { exclusiveMaximum: max }, {
        [JSONSchemaId]: { exclusiveMaximum: max }
      })
    )

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo = (max: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a <= max, `a number less than or equal to ${max}`, { maximum: max }, {
        [JSONSchemaId]: { maximum: max }
      })
    )

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.length <= maxLength,
        `a string at most ${maxLength} character(s) long`,
        { maxLength },
        {
          [JSONSchemaId]: { maxLength }
        }
      )
    )

/**
 * @since 1.0.0
 */
export const minLength = (
  minLength: number
) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.length >= minLength,
        `a string at least ${minLength} character(s) long`,
        { minLength },
        {
          [JSONSchemaId]: { minLength }
        }
      )
    )

/**
 * @since 1.0.0
 */
export const nonNaN = <A extends number>(self: Schema<A>): Schema<A> =>
  pipe(
    self,
    I.filter((a): a is A => !Number.isNaN(a), "a number NaN excluded", { type: "nonNaN" })
  )

/**
 * @since 1.0.0
 */
export const pattern = (
  regex: RegExp,
  meta?: object,
  annotations?: Annotated["annotations"]
) =>
  <A extends string>(self: Schema<A>): Schema<A> => {
    const pattern = regex.source
    return pipe(
      self,
      I.filter(
        (a): a is A => regex.test(a),
        `a string matching the pattern ${pattern}`,
        { pattern, ...meta },
        {
          [JSONSchemaId]: { pattern },
          ...annotations
        }
      )
    )
  }

/**
 * @since 1.0.0
 */
export const startsWith = (startsWith: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.startsWith(startsWith),
        `a string starting with ${JSON.stringify(startsWith)}`,
        { startsWith },
        {
          [JSONSchemaId]: { pattern: `^${startsWith}` }
        }
      )
    )

/**
 * @since 1.0.0
 */
export const endsWith = (endsWith: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.endsWith(endsWith),
        `a string ending with ${JSON.stringify(endsWith)}`,
        { endsWith },
        {
          [JSONSchemaId]: { pattern: `^.*${endsWith}$` }
        }
      )
    )

/**
 * @since 1.0.0
 */
export const includes = (searchString: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter(
        (a): a is A => a.includes(searchString),
        `a string including ${JSON.stringify(searchString)}`,
        { includes: searchString },
        {
          [JSONSchemaId]: { pattern: `.*${searchString}.*` }
        }
      )
    )
