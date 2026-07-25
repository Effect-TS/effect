/**
 * Frontend fixture.
 * @since 1.0.0
 */

/**
 * A callable value.
 * @example
 * ```ts
 * export const value = callable("a")
 * ```
 * @since 1.0.0
 */
export const callable = (value: string): number => value.length

/** A constant. @since 1.0.0 */
export const constant: string = "constant"

/** A model. @since 1.0.0 */
export interface Model {
  readonly value: string
}

/** An alias. @since 1.0.0 */
export type Alias = string

/** A class. @since 1.0.0 */
export class Example {
  /** A property. */
  readonly value: string = ""
  /** An instance method. */
  method(value: string): string {
    return value
  }
  /** A static method. */
  static method(value: string): string {
    return value
  }
}

/** A namespace. @since 1.0.0 */
export namespace Nested {
  /** A nested alias. @since 1.0.0 */
  export type Value = string
}

/** @since 1.0.0 */
export { constant as renamed }
