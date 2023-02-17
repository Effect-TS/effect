/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/core/Function"
import * as I from "@fp-ts/schema/internal/common"
import type { AnnotationOptions, Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const greaterThan = <A extends bigint>(
  min: bigint,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a > min, {
        description: `a bigint greater than ${min}`,
        jsonSchema: { exclusiveMinimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = <A extends bigint>(
  min: bigint,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a >= min, {
        description: `a bigint greater than or equal to ${min}`,
        jsonSchema: { minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const lessThan = <A extends bigint>(max: bigint, annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a < max, {
        description: `a bigint less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo = <A extends bigint>(
  max: bigint,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a <= max, {
        description: `a bigint less than or equal to ${max}`,
        jsonSchema: { maximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const between = <A extends bigint>(
  min: bigint,
  max: bigint,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a >= min && a <= max, {
        description: `a bigint between ${min} and ${max}`,
        jsonSchema: { maximum: max, minimum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const positive = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThan(0n, {
    description: "a positive bigint",
    custom: { type: "positive" },
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const negative = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThan(0n, {
    description: "a negative bigint",
    custom: { type: "negative" },
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const nonNegative = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThanOrEqualTo(0n, {
    description: "a non-negative bigint",
    custom: { type: "nonNegative" },
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const nonPositive = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThanOrEqualTo(0n, {
    description: "a non-positive bigint",
    custom: { type: "nonPositive" },
    ...annotationOptions
  })
