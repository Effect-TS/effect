/**
 * @since 1.0.0
 */

import {
  jsonSchemaAnnotation,
  JSONSchemaAnnotationId
} from "@fp-ts/schema/annotation/JSONSchemaAnnotation"
import type { Annotated } from "@fp-ts/schema/AST"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const finite = <A extends number>(self: Schema<A>): Schema<A> =>
  I.filter(self, (a): a is A => Number.isFinite(a), {
    message: "a finite number",
    meta: { type: "finite" }
  })

/**
 * @since 1.0.0
 */
export const greaterThan = (min: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a > min, {
      message: `a number greater than ${min}`,
      meta: { exclusiveMinimum: min }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ exclusiveMinimum: min })
    })

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = (min: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a >= min, {
      message: `a number greater than or equal to ${min}`,
      meta: { minimum: min }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ minimum: min })
    })

/**
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(constructor: A) =>
  (self: Schema<object>): Schema<InstanceType<A>> =>
    I.filter(self, (a): a is InstanceType<A> => a instanceof constructor, {
      message: `an instance of ${constructor.name}`,
      meta: { instanceof: constructor }
    })

/**
 * @since 1.0.0
 */
export const int = <A extends number>(self: Schema<A>): Schema<A> =>
  I.filter(self, (a): a is A => Number.isInteger(a), {
    message: "an integer",
    meta: { type: "integer" }
  }, {
    [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ type: "integer" })
  })

/**
 * @since 1.0.0
 */
export const lessThan = (max: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a < max, {
      message: `a number less than ${max}`,
      meta: { exclusiveMaximum: max }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ exclusiveMaximum: max })
    })

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo = (max: number) =>
  <A extends number>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a <= max, {
      message: `a number less than or equal to ${max}`,
      meta: { maximum: max }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ maximum: max })
    })

/**
 * @since 1.0.0
 */
export const maxLength = (
  maxLength: number
) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a.length <= maxLength, {
      message: `a string at most ${maxLength} character(s) long`,
      meta: { maxLength }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ maxLength })
    })

/**
 * @since 1.0.0
 */
export const minLength = (
  minLength: number
) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a.length >= minLength, {
      message: `a string at least ${minLength} character(s) long`,
      meta: { minLength }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ minLength })
    })

/**
 * @since 1.0.0
 */
export const nonNaN = <A extends number>(self: Schema<A>): Schema<A> =>
  I.filter(self, (a): a is A => !Number.isNaN(a), {
    message: "a number NaN excluded",
    meta: { type: "NonNaN" }
  })

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
    return I.filter(
      self,
      (a): a is A => regex.test(a),
      {
        message: `a string matching the pattern: ${pattern}`,
        meta: { pattern, ...meta }
      },
      {
        [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ pattern }),
        ...annotations
      }
    )
  }

/**
 * @since 1.0.0
 */
export const startsWith = (startsWith: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a.startsWith(startsWith), {
      message: `a string starting with ${JSON.stringify(startsWith)}`,
      meta: { startsWith }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ pattern: `^${startsWith}` })
    })

/**
 * @since 1.0.0
 */
export const endsWith = (endsWith: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a.endsWith(endsWith), {
      message: `a string ending with ${JSON.stringify(endsWith)}`,
      meta: { endsWith }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ pattern: `^.*${endsWith}$` })
    })

/**
 * @since 1.0.0
 */
export const includes = (searchString: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.filter(self, (a): a is A => a.includes(searchString), {
      message: `a string including ${JSON.stringify(searchString)}`,
      meta: { includes: searchString }
    }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ pattern: `.*${searchString}.*` })
    })
