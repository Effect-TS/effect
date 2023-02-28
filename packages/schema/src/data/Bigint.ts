/**
 * @since 1.0.0
 */

import * as B from "@effect/data/Bigint"
import { pipe } from "@effect/data/Function"
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
        description: `a bigint greater than ${min}n`,
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
        description: `a bigint greater than or equal to ${min}n`,
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
        description: `a bigint less than ${max}n`,
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
        description: `a bigint less than or equal to ${max}n`,
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
        description: `a bigint between ${min}n and ${max}n`,
        jsonSchema: { maximum: max, minimum: min },
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

/**
 * Clamps a bigint between a minimum and a maximum value.
 *
 * @since 1.0.0
 */
export const clamp = <A extends bigint>(min: bigint, max: bigint) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.transform(
        pipe(self, between(min, max)),
        (self) => B.clamp(self, min, max) as A,
        (self) => B.clamp(self, min, max) as A
      )
    )
