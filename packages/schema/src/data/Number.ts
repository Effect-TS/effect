/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as N from "@effect/data/Number"
import * as I from "@effect/schema/internal/common"
import * as PR from "@effect/schema/ParseResult"
import type { AnnotationOptions, Schema } from "@effect/schema/Schema"

/**
 * @since 1.0.0
 */
export const FiniteTypeId = "@effect/schema/data/Number/FiniteTypeId"

/**
 * @since 1.0.0
 */
export const finite = <A extends number>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => Number.isFinite(a), {
        typeId: FiniteTypeId,
        description: "a finite number",
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const GreaterThanTypeId = "@effect/schema/data/Number/GreaterThanTypeId"

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
        typeId: GreaterThanTypeId,
        description: `a number greater than ${min}`,
        jsonSchema: { exclusiveMinimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const GreaterThanOrEqualToTypeId = "@effect/schema/data/Number/GreaterThanOrEqualToTypeId"

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
        typeId: GreaterThanOrEqualToTypeId,
        description: `a number greater than or equal to ${min}`,
        jsonSchema: { minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const MultipleOfTypeId = "@effect/schema/data/Number/MultipleOfTypeId"

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
        typeId: MultipleOfTypeId,
        description: `a number divisible by ${divisor}`,
        jsonSchema: { multipleOf: Math.abs(divisor) }, // spec requires positive divisor
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const IntTypeId = "@effect/schema/data/Number/IntTypeId"

/**
 * @since 1.0.0
 */
export const int = <A extends number>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => Number.isInteger(a), {
        typeId: IntTypeId,
        description: "integer",
        jsonSchema: { type: "integer" },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanTypeId = "@effect/schema/data/Number/LessThanTypeId"

/**
 * @since 1.0.0
 */
export const lessThan = <A extends number>(max: number, annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => a < max, {
        typeId: LessThanTypeId,
        description: `a number less than ${max}`,
        jsonSchema: { exclusiveMaximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const LessThanOrEqualToTypeId = "@effect/schema/data/Number/LessThanOrEqualToTypeId"

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
        typeId: LessThanOrEqualToTypeId,
        description: `a number less than or equal to ${max}`,
        jsonSchema: { maximum: max },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const BetweenTypeId = "@effect/schema/data/Number/BetweenTypeId"

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
        typeId: BetweenTypeId,
        description: `a number between ${min} and ${max}`,
        jsonSchema: { maximum: max, minimum: min },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const NonNaNTypeId = "@effect/schema/data/Number/NonNaNTypeId"

/**
 * @since 1.0.0
 */
export const nonNaN = <A extends number>(annotationOptions?: AnnotationOptions<A>) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.filter((a): a is A => !Number.isNaN(a), {
        typeId: NonNaNTypeId,
        description: "a number NaN excluded",
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const PositiveTypeId = "@effect/schema/data/Number/PositiveTypeId"

/**
 * @since 1.0.0
 */
export const positive = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThan(0, {
    typeId: PositiveTypeId,
    description: "a positive number",
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const NegativeTypeId = "@effect/schema/data/Number/NegativeTypeId"

/**
 * @since 1.0.0
 */
export const negative = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThan(0, {
    typeId: NegativeTypeId,
    description: "a negative number",
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const NonNegativeTypeId = "@effect/schema/data/Number/NonNegativeTypeId"

/**
 * @since 1.0.0
 */
export const nonNegative = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  greaterThanOrEqualTo(0, {
    typeId: NonNegativeTypeId,
    description: "a non-negative number",
    ...annotationOptions
  })

/**
 * @since 1.0.0
 */
export const NonPositiveTypeId = "@effect/schema/data/Number/NonPositiveTypeId"

/**
 * @since 1.0.0
 */
export const nonPositive = <A extends number>(
  annotationOptions?: AnnotationOptions<A>
): (self: Schema<A>) => Schema<A> =>
  lessThanOrEqualTo(0, {
    typeId: NonPositiveTypeId,
    description: "a non-positive number",
    ...annotationOptions
  })

/**
 * Clamps a number between a minimum and a maximum value.
 *
 * @since 1.0.0
 */
export const clamp = <A extends number>(min: number, max: number) =>
  (self: Schema<A>): Schema<A> =>
    pipe(
      self,
      I.transform(
        pipe(self, between<A>(min, max)),
        (self) => N.clamp(self, min, max) as A,
        (self) => N.clamp(self, min, max) as A
      )
    )

/**
  Transforms a `string` into a `number` by parsing the string using `parseFloat`.

  The following special string values are supported: "NaN", "Infinity", "-Infinity".

  @since 1.0.0
*/
export const parseString = (self: Schema<string>): Schema<number> => {
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
