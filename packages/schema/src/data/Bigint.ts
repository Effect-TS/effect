/**
 * @since 1.0.0
 */

import * as B from "@effect/data/Bigint"
import { pipe } from "@effect/data/Function"
import * as I from "@effect/schema/internal/common"
import type { AnnotationOptions, Schema } from "@effect/schema/Schema"

/**
 * @since 1.0.0
 */
export const GreaterThanTypeId = "@effect/schema/data/Bigint/GreaterThanTypeId"

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
        typeId: GreaterThanTypeId,
        description: `a bigint greater than ${min}n`,
        jsonSchema: { exclusiveMinimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const GreaterThanOrEqualToTypeId = "@effect/schema/data/Bigint/GreaterThanOrEqualToTypeId"

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
        typeId: GreaterThanOrEqualToTypeId,
        description: `a bigint greater than or equal to ${min}n`,
        jsonSchema: { minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanTypeId = "@effect/schema/data/Bigint/LessThanTypeId"

/**
 * @since 1.0.0
 */
export const lessThan = <A extends bigint>(max: bigint, annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a < max, {
        typeId: LessThanTypeId,
        description: `a bigint less than ${max}n`,
        jsonSchema: { exclusiveMaximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanOrEqualToTypeId = "@effect/schema/data/Bigint/LessThanOrEqualToTypeId"

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
        typeId: LessThanOrEqualToTypeId,
        description: `a bigint less than or equal to ${max}n`,
        jsonSchema: { maximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const BetweenTypeId = "@effect/schema/data/Bigint/BetweenTypeId"

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
        typeId: BetweenTypeId,
        description: `a bigint between ${min}n and ${max}n`,
        jsonSchema: { maximum: max, minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const PositiveTypeId = "@effect/schema/data/Bigint/PositiveTypeId"

/**
 * @since 1.0.0
 */
export const positive = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThan(0n, {
    typeId: PositiveTypeId,
    description: "a positive bigint",
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const NegativeTypeId = "@effect/schema/data/Bigint/NegativeTypeId"

/**
 * @since 1.0.0
 */
export const negative = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThan(0n, {
    typeId: NegativeTypeId,
    description: "a negative bigint",
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const NonNegativeTypeId = "@effect/schema/data/Bigint/NonNegativeTypeId"

/**
 * @since 1.0.0
 */
export const nonNegative = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThanOrEqualTo(0n, {
    typeId: NonNegativeTypeId,
    description: "a non-negative bigint",
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const NonPositiveTypeId = "@effect/schema/data/Bigint/NonPositiveTypeId"

/**
 * @since 1.0.0
 */
export const nonPositive = <A extends bigint>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThanOrEqualTo(0n, {
    typeId: NonPositiveTypeId,
    description: "a non-positive bigint",
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
