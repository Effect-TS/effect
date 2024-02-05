/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Layer from "effect/Layer"
import * as InternalCliConfig from "./internal/cliConfig.js"

/**
 * Represents how arguments from the command-line are to be parsed.
 *
 * @since 1.0.0
 * @category models
 */
export interface CliConfig {
  /**
   * Whether or not the argument parser should be case sensitive.
   *
   * Defaults to `false`.
   */
  readonly isCaseSensitive: boolean
  /**
   * Levenstein distance threshold for when to show auto correct suggestions.
   *
   * Defaults to `2`.
   */
  readonly autoCorrectLimit: number
  /**
   * Whether or not to perform a final check of the command-line arguments for
   * a built-in option, even if the provided command is not valid.
   *
   * Defaults to `false`.
   */
  readonly finalCheckBuiltIn: boolean
  /**
   * Whether or not to display all the names of an option in the usage of a
   * particular command.
   *
   * Defaults to `true`.
   */
  readonly showAllNames: boolean
  /**
   * Whether or not to display built-in options in the help documentation
   * generated for a `Command`.
   *
   * Defaults to `true`.
   */
  readonly showBuiltIns: boolean
  /**
   * Whether or not to display the type of an option in the usage of a
   * particular command.
   *
   * Defaults to `true`.
   */
  readonly showTypes: boolean
}

/**
 * @since 1.0.0
 * @category context
 */
export const CliConfig: Context.Tag<CliConfig, CliConfig> = InternalCliConfig.Tag

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultConfig: CliConfig = InternalCliConfig.defaultConfig

/**
 * @since 1.0.0
 * @category context
 */
export const defaultLayer: Layer.Layer<CliConfig> = InternalCliConfig.defaultLayer

/**
 * @since 1.0.0
 * @category context
 */
export const layer: (config?: Partial<CliConfig>) => Layer.Layer<CliConfig> = InternalCliConfig.layer

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (params: Partial<CliConfig>) => CliConfig = InternalCliConfig.make

/**
 * @since 1.0.0
 * @category utilities
 */
export const normalizeCase: {
  (text: string): (self: CliConfig) => string
  (self: CliConfig, text: string): string
} = InternalCliConfig.normalizeCase
