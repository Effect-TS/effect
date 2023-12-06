/**
 * @since 2.0.0
 */
import type * as Equal from "./Equal.js"
import * as InternalSecret from "./internal/secret.js"

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
export interface Secret extends Secret.Proto, Equal.Equal {
  /** @internal */
  readonly raw: Array<number>
}

/**
 * @since 2.0.0
 */
export declare namespace Secret {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [SecretTypeId]: SecretTypeId
  }
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSecret: (u: unknown) => u is Secret = InternalSecret.isSecret

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (bytes: Array<number>) => Secret = InternalSecret.make

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: (iterable: Iterable<string>) => Secret = InternalSecret.fromIterable

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromString: (text: string) => Secret = InternalSecret.fromString

/**
 * @since 2.0.0
 * @category getters
 */
export const value: (self: Secret) => string = InternalSecret.value

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeWipe: (self: Secret) => void = InternalSecret.unsafeWipe
