/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Effect } from "effect/Effect"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { CliConfig } from "./CliConfig.js"
import type { HelpDoc } from "./HelpDoc.js"
import type { Span } from "./HelpDoc/Span.js"
import * as InternalPrimitive from "./internal/primitive.js"
import type { Prompt } from "./Prompt.js"

/**
 * @since 1.0.0
 * @category symbol
 */
export const PrimitiveTypeId: unique symbol = InternalPrimitive.PrimitiveTypeId as PrimitiveTypeId

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
export interface Primitive<A> extends Primitive.Variance<A> {}

/**
 * @since 1.0.0
 */
export declare namespace Primitive {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> extends Pipeable {
    readonly [PrimitiveTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type PathExists = "yes" | "no" | "either"

  /**
   * @since 1.0.0
   * @category models
   */
  export type PathType = "file" | "directory" | "either"

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
 * @since 1.0.0
 * @category Predicates
 */
export const isBool: <A>(self: Primitive<A>) => boolean = InternalPrimitive.isBool

/**
 * Represents a boolean value.
 *
 * True values can be passed as one of: `["true", "1", "y", "yes" or "on"]`.
 * False value can be passed as one of: `["false", "o", "n", "no" or "off"]`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (defaultValue: Option<boolean>) => Primitive<boolean> = InternalPrimitive.boolean

/**
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A>(alternatives: ReadonlyArray<[string, A]>) => Primitive<A> = InternalPrimitive.choice

/**
 * Represents a date in ISO-8601 format, such as `2007-12-03T10:15:30`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const date: Primitive<globalThis.Date> = InternalPrimitive.date

/**
 * Represents a floating point number.
 *
 * @since 1.0.0
 * @category constructors
 */
export const float: Primitive<number> = InternalPrimitive.float

/**
 * Returns a text representation of the valid choices for a primitive type, if
 * any.
 *
 * @since 1.0.0
 * @category combinators
 */
export const getChoices: <A>(self: Primitive<A>) => Option<string> = InternalPrimitive.getChoices

/**
 * Returns help documentation for a primitive type.
 *
 * @since 1.0.0
 * @category combinators
 */
export const getHelp: <A>(self: Primitive<A>) => Span = InternalPrimitive.getHelp

/**
 * Returns a string representation of the primitive type.
 *
 * @since 1.0.0
 * @category combinators
 */
export const getTypeName: <A>(self: Primitive<A>) => string = InternalPrimitive.getTypeName

/**
 * Represents an integer.
 *
 * @since 1.0.0
 * @category constructors
 */
export const integer: Primitive<number> = InternalPrimitive.integer

/**
 * Represents a user-defined piece of text.
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: Primitive<string> = InternalPrimitive.text

/**
 * Validates that the specified value, if any, matches the specified primitive
 * type.
 *
 * @since 1.0.0
 * @category combinators
 */
export const validate: {
  (
    value: Option<string>,
    config: CliConfig
  ): <A>(self: Primitive<A>) => Effect<A, string, FileSystem>
  <A>(
    self: Primitive<A>,
    value: Option<string>,
    config: CliConfig
  ): Effect<A, string, FileSystem>
} = InternalPrimitive.validate

/**
 * Runs a wizard that will prompt the user for input matching the specified
 * primitive type.
 *
 * @since 1.0.0
 * @category combinators
 */
export const wizard: {
  (help: HelpDoc): <A>(self: Primitive<A>) => Prompt<A>
  <A>(self: Primitive<A>, help: HelpDoc): Prompt<A>
} = InternalPrimitive.wizard
