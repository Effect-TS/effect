/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Effect } from "effect/Effect"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { CliConfig } from "./CliConfig.js"
import type { Span } from "./HelpDoc/Span.js"
import * as InternalPrimitive from "./internal/primitive.js"

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
export interface Primitive<A> extends Primitive.Variance<A> {
  get typeName(): string
  get help(): Span
  get choices(): Option<string>
  validate(value: Option<string>, config: CliConfig): Effect<FileSystem, string, A>
}

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
 * @since 1.0.0
 * @category constructors
 */
export const boolean: (defaultValue: Option<boolean>) => Primitive<boolean> =
  InternalPrimitive.boolean

/**
 * @since 1.0.0
 * @category constructors
 */
export const choice: <A>(alternatives: NonEmptyReadonlyArray<[string, A]>) => Primitive<A> =
  InternalPrimitive.choice

/**
 * @since 1.0.0
 * @category constructors
 */
export const date: Primitive<globalThis.Date> = InternalPrimitive.date

/**
 * @since 1.0.0
 * @category constructors
 */
export const float: Primitive<number> = InternalPrimitive.float

/**
 * @since 1.0.0
 * @category constructors
 */
export const integer: Primitive<number> = InternalPrimitive.integer

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: Primitive<string> = InternalPrimitive.text
