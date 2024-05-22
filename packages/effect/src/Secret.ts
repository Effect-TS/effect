/**
 * @since 2.0.0
 */
import type * as Equal from "./Equal.js"
import * as InternalSecret from "./internal/secret.js"
import type { Pipeable } from "./Pipeable.js"
import type { Covariant } from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const SecretTypeId: unique symbol = InternalSecret.SecretTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SecretTypeId = typeof SecretTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Secret<out A> extends Secret.Variance<A>, Equal.Equal, Pipeable {
}

/**
 * @since 2.0.0
 */
export declare namespace Secret {
  /**
   * @since 4.0.0
   * @category models
   */
  export interface Variance<out A> {
    readonly [SecretTypeId]: {
      readonly _A: Covariant<A>
    }
  }

  /**
   * @since 4.0.0
   * @category type-level
   */
  export type Value<T extends Secret<any>> = [T] extends [Secret<infer _A>] ? _A : never
}

/**
 * @since 4.0.0
 * @category refinements
 */
export const isSecret: (u: unknown) => u is Secret<unknown> = InternalSecret.isSecret

/**
 * @since 4.0.0
 * @category constructors
 */
export const make: <T>(value: T) => Secret<T> = InternalSecret.make

/**
 * @since 4.0.0
 * @category getters
 */
export const value: <T>(self: Secret<T>) => T = InternalSecret.value

/**
 * @since 4.0.0
 * @category unsafe
 */
export const unsafeWipe: <T>(self: Secret<T>) => void = InternalSecret.unsafeWipe
