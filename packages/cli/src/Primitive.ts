/**
 * @since 1.0.0
 */
import type { Span } from "@effect/cli/HelpDoc/Span"
import * as internal from "@effect/cli/internal/primitive"
import type { Option } from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import type { Effect } from "@effect/io/Effect"

/**
 * @since 1.0.0
 * @category symbol
 */
export const PrimitiveTypeId: unique symbol = internal.PrimitiveTypeId as PrimitiveTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type PrimitiveTypeId = typeof PrimitiveTypeId

/**
 * A `Primitive` represents the primitive types supported by Effect CLI.
 *
 * Each primitive type has a way to parse and validate from a string.
 *
 * @since 1.0.0
 * @category models
 */
export type Primitive<A> = Bool | Date | Choice<A> | Float | Integer | Text

/**
 * @since 1.0.0
 */
export declare namespace Primitive {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [PrimitiveTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValueType<P> = [P] extends [{
    readonly [PrimitiveTypeId]: {
      readonly _A: (_: never) => infer A
    }
  }] ? A
    : never
}

/**
 * Represents a boolean value.
 *
 * True values can be passed as one of: `["true", "1", "y", "yes" or "on"]`.
 * False value can be passed as one of: `["false", "o", "n", "no" or "off"]`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Bool extends Primitive.Variance<boolean> {
  readonly _tag: "Bool"
  /**
   * The default value to use if the parameter is not provided.
   */
  readonly defaultValue: Option<boolean>
}

/**
 * Represents a date in ISO-8601 format, such as `2007-12-03T10:15:30`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Date extends Primitive.Variance<globalThis.Date> {
  readonly _tag: "Date"
}

/**
 * Represents a value selected from set of allowed values.
 *
 * @since 1.0.0
 * @category models
 */
export interface Choice<A> extends Primitive.Variance<A> {
  readonly _tag: "Choice"
  /**
   * The list of allowed parameter-value pairs.
   */
  readonly choices: NonEmptyReadonlyArray<readonly [string, A]>
}

/**
 * Represents a floating point number.
 *
 * @since 1.0.0
 * @category models
 */
export interface Float extends Primitive.Variance<number> {
  readonly _tag: "Float"
}

/**
 * Represents an integer.
 *
 * @since 1.0.0
 * @category models
 */
export interface Integer extends Primitive.Variance<number> {
  readonly _tag: "Integer"
}

/**
 * Represents a string value.
 *
 * @since 1.0.0
 * @category models
 */
export interface Text extends Primitive.Variance<string> {
  readonly _tag: "Text"
}

/**
 * @since 1.0.0
 * @category Predicates
 */
export const isBool: <A>(self: Primitive<A>) => boolean = internal.isBool

/**
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (defaultValue: Option<boolean>) => Primitive<boolean> = internal.boolean

/**
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A>(choices: NonEmptyReadonlyArray<readonly [string, A]>) => Primitive<A> = internal.choice

/**
 * @since 1.0.0
 * @category getters
 */
export const choices: <A>(self: Primitive<A>) => Option<string> = internal.choices

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: Primitive<globalThis.Date> = internal.date

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: Primitive<number> = internal.float

/**
 * @since 1.0.0
 * @category getters
 */
export const helpDoc: <A>(self: Primitive<A>) => Span = internal.helpDoc

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: Primitive<number> = internal.integer

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: Primitive<string> = internal.text

/**
 * @since 1.0.0
 * @category getters
 */
export const typeName: <A>(self: Primitive<A>) => string = internal.typeName

/**
 * @since 1.0.0
 * @category validation
 */
export const validate: {
  (value: Option<string>): <A>(self: Primitive<A>) => Effect<never, string, A>
  <A>(self: Primitive<A>, value: Option<string>): Effect<never, string, A>
} = internal.validate
