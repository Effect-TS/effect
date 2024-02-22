/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type { And, InvalidData, MissingData, Or, SourceUnavailable, Unsupported } from "./internal/configError.js"
import * as internal from "./internal/configError.js"

export {
  /**
   * @since 2.0.0
   * @category models
   */
  And,
  /**
   * @since 2.0.0
   * @category models
   */
  InvalidData,
  /**
   * @since 2.0.0
   * @category models
   */
  MissingData,
  /**
   * @since 2.0.0
   * @category models
   */
  Or,
  /**
   * @since 2.0.0
   * @category models
   */
  SourceUnavailable,
  /**
   * @since 2.0.0
   * @category models
   */
  Unsupported
} from "./internal/configError.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ConfigErrorTypeId: unique symbol = internal.ConfigErrorTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ConfigErrorTypeId = typeof ConfigErrorTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const Discriminant: unique symbol = internal.Discriminant

/**
 * @since 2.0.0
 * @category symbols
 */
export type Discriminant = typeof Discriminant

/**
 * The possible ways that loading configuration data may fail.
 *
 * @since 2.0.0
 * @category models
 */
export type ConfigError =
  | internal.And
  | internal.Or
  | internal.InvalidData
  | internal.MissingData
  | internal.SourceUnavailable
  | internal.Unsupported

/**
 * @since 2.0.0
 */
export declare namespace ConfigError {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly _tag: "ConfigError"
    readonly [ConfigErrorTypeId]: ConfigErrorTypeId
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type Reducer<C, Z> = ConfigErrorReducer<C, Z>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface ConfigErrorReducer<in C, in out Z> {
  andCase(context: C, left: Z, right: Z): Z
  orCase(context: C, left: Z, right: Z): Z
  invalidDataCase(context: C, path: ReadonlyArray<string>, message: string): Z
  missingDataCase(context: C, path: ReadonlyArray<string>, message: string): Z
  sourceUnavailableCase(
    context: C,
    path: ReadonlyArray<string>,
    message: string,
    cause: Cause.Cause<unknown>
  ): Z
  unsupportedCase(context: C, path: ReadonlyArray<string>, message: string): Z
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Options {
  readonly pathDelim: string
}

/**
 * Returns `true` if the specified value is a `ConfigError`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isConfigError: (u: unknown) => u is ConfigError = internal.isConfigError

/**
 * Returns `true` if the specified `ConfigError` is an `And`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isAnd: (self: ConfigError) => self is And = internal.isAnd

/**
 * Returns `true` if the specified `ConfigError` is an `Or`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isOr: (self: ConfigError) => self is Or = internal.isOr

/**
 * Returns `true` if the specified `ConfigError` is an `InvalidData`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isInvalidData: (self: ConfigError) => self is InvalidData = internal.isInvalidData

/**
 * Returns `true` if the specified `ConfigError` is an `MissingData`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isMissingData: (self: ConfigError) => self is MissingData = internal.isMissingData

/**
 * Returns `true` if the specified `ConfigError` contains only `MissingData` errors, `false` otherwise.
 *
 * @since 2.0.0
 * @categer getters
 */
export const isMissingDataOnly: (self: ConfigError) => boolean = internal.isMissingDataOnly

/**
 * Returns `true` if the specified `ConfigError` is a `SourceUnavailable`,
 * `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isSourceUnavailable: (self: ConfigError) => self is SourceUnavailable = internal.isSourceUnavailable

/**
 * Returns `true` if the specified `ConfigError` is an `Unsupported`, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isUnsupported: (self: ConfigError) => self is Unsupported = internal.isUnsupported

/**
 * @since 2.0.0
 * @category utils
 */
export const prefixed: {
  (prefix: Array<string>): (self: ConfigError) => ConfigError
  (self: ConfigError, prefix: Array<string>): ConfigError
} = internal.prefixed

/**
 * @since 2.0.0
 * @category folding
 */
export const reduceWithContext: {
  <C, Z>(context: C, reducer: ConfigErrorReducer<C, Z>): (self: ConfigError) => Z
  <C, Z>(self: ConfigError, context: C, reducer: ConfigErrorReducer<C, Z>): Z
} = internal.reduceWithContext
