/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
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

// https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
// https://github.com/colinhacks/zod/blob/5616f6b505090ebb1775d1d5567d3ee7baa5519d/src/types.ts#L915
function floatSafeRemainder(val: number, step: number) {
  const valDecCount = (val.toString().split(".")[1] || "").length
  const stepDecCount = (step.toString().split(".")[1] || "").length
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""))
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""))
  return (valInt % stepInt) / Math.pow(10, decCount)
}

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
      I.filter((a): a is A => floatSafeRemainder(a, divisor) === 0, {
        description: `a number divisible by ${divisor}`,
        jsonSchema: { multipleOf: divisor < 0 ? -divisor : divisor }, // spec requires positive divisor
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A,
  annotationOptions?: AnnotationOptions<object>
) =>
  (self: Schema<object>): Schema<InstanceType<A>> =>
    pipe(
      self,
      I.filter(
        (a): a is InstanceType<A> => a instanceof constructor,
        {
          description: `an instance of ${constructor.name}`,
          custom: { type: "instanceOf", instanceOf: constructor },
          ...annotationOptions
        }
      )
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
export const pattern = <A extends string>(
  regex: RegExp,
  annotationOptions?: AnnotationOptions<A>
) =>
  (self: Schema<A>): Schema<A> => {
    const pattern = regex.source
    return pipe(
      self,
      I.filter(
        (a): a is A => regex.test(a),
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
