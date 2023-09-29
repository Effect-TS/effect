/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk"
import type * as Equal from "./Equal"
import * as internal from "./internal/configSecret"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ConfigSecretTypeId: unique symbol = internal.ConfigSecretTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ConfigSecretTypeId = typeof ConfigSecretTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface ConfigSecret extends ConfigSecret.Proto, Equal.Equal {
  /** @internal */
  readonly raw: Array<number>
}

/**
 * @since 2.0.0
 */
export declare namespace ConfigSecret {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [ConfigSecretTypeId]: ConfigSecretTypeId
  }
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isConfigSecret: (u: unknown) => u is ConfigSecret = internal.isConfigSecret

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (bytes: Array<number>) => ConfigSecret = internal.make

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromChunk: (chunk: Chunk.Chunk<string>) => ConfigSecret = internal.fromChunk

/**
 * @since 2.0.0
 * @category constructors
 */
export const fromString: (text: string) => ConfigSecret = internal.fromString

/**
 * @since 2.0.0
 * @category getters
 */
export const value: (self: ConfigSecret) => string = internal.value

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeWipe: (self: ConfigSecret) => void = internal.unsafeWipe
