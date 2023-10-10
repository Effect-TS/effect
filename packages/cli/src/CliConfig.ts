/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/cliConfig"

/**
 * Represents how arguments from the command-line are to be parsed.
 *
 * @since 1.0.0
 * @category models
 */
export interface CliConfig {
  /**
   * Whether or not the argument parser should be case sensitive.
   */
  readonly isCaseSensitive: boolean
  /**
   * Threshold for when to show auto correct suggestions.
   */
  readonly autoCorrectLimit: number
}

/**
 * @since 1.0.0
 * @category context
 */
export const CliConfig: Context.Tag<CliConfig, CliConfig> = internal.Tag

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultConfig: CliConfig = internal.defaultConfig

/**
 * @since 1.0.0
 * @category context
 */
export const defaultLayer: Layer.Layer<never, never, CliConfig> = internal.defaultLayer

/**
 * @since 1.0.0
 * @category context
 */
export const layer: (config: CliConfig) => Layer.Layer<never, never, CliConfig> = internal.layer

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (isCaseSensitive: boolean, autoCorrectLimit: number) => CliConfig = internal.make

/**
 * @since 1.0.0
 * @category utilities
 */
export const normalizeCase: {
  (text: string): (self: CliConfig) => string
  (self: CliConfig, text: string): string
} = internal.normalizeCase
