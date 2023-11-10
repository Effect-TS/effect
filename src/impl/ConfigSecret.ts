/**
 * @since 2.0.0
 */
import type { Chunk } from "../Chunk.js"
import type { ConfigSecret } from "../ConfigSecret.js"
import * as internal from "../internal/configSecret.js"

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
export const fromChunk: (chunk: Chunk<string>) => ConfigSecret = internal.fromChunk

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
