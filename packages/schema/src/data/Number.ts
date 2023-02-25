/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as N from "@effect/data/Number"
import * as I from "@fp-ts/schema/internal/common"
import type { AnnotationOptions, Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const finite = <A extends number>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => Number.isFinite(a), {
        description: "a finite number",
        custom: { type: "finite" },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const greaterThan = <A extends number>(
  min: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a > min, {
        description: `a number greater than ${min}`,
        jsonSchema: { exclusiveMinimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = <A extends number>(
  min: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a >= min, {
        description: `a number greater than or equal to ${min}`,
        jsonSchema: { minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const multipleOf = <A extends number>(
  divisor: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => N.remainder(a, divisor) === 0, {
        description: `a number divisible by ${divisor}`,
        jsonSchema: { multipleOf: Math.abs(divisor) }, // spec requires positive divisor
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const int = <A extends number>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => Number.isInteger(a), {
        description: "integer",
        jsonSchema: { type: "integer" },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const lessThan = <A extends number>(max: number, annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a < max, {
        description: `a number less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo = <A extends number>(
  max: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a <= max, {
        description: `a number less than or equal to ${max}`,
        jsonSchema: { maximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const between = <A extends number>(
  min: number,
  max: number,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a >= min && a <= max, {
        description: `a number between ${min} and ${max}`,
        jsonSchema: { maximum: max, minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const nonNaN = <A extends number>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => !Number.isNaN(a), {
        description: "a number NaN excluded",
        custom: { type: "nonNaN" },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const positive = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThan(0, {
    description: "a positive number",
    custom: { type: "positive" },
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const negative = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThan(0, {
    description: "a negative number",
    custom: { type: "negative" },
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThanOrEqualTo(0, {
    description: "a non-negative number",
    custom: { type: "nonNegative" },
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThanOrEqualTo(0, {
    description: "a non-positive number",
    custom: { type: "nonPositive" },
    ...annotationOptions
  })
