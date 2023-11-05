/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import * as internal from "./internal/configError.js"

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
 * The possible ways that loading configuration data may fail.
 *
 * @since 2.0.0
 * @category models
 */
export type ConfigError =
  | And
  | Or
  | InvalidData
  | MissingData
  | SourceUnavailable
  | Unsupported

/**
 * @since 2.0.0
 */
export declare namespace ConfigError {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
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
export interface ConfigErrorReducer<C, Z> {
  readonly andCase: (context: C, left: Z, right: Z) => Z
  readonly orCase: (context: C, left: Z, right: Z) => Z
  readonly invalidDataCase: (context: C, path: Array<string>, message: string) => Z
  readonly missingDataCase: (context: C, path: Array<string>, message: string) => Z
  readonly sourceUnavailableCase: (
    context: C,
    path: Array<string>,
    message: string,
    cause: Cause.Cause<unknown>
  ) => Z
  readonly unsupportedCase: (context: C, path: Array<string>, message: string) => Z
}

/**
 * @since 2.0.0
 * @category models
 */
export interface And extends ConfigError.Proto {
  readonly _tag: "And"
  readonly left: ConfigError
  readonly right: ConfigError
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Or extends ConfigError.Proto {
  readonly _tag: "Or"
  readonly left: ConfigError
  readonly right: ConfigError
}

/**
 * @since 2.0.0
 * @category models
 */
export interface InvalidData extends ConfigError.Proto {
  readonly _tag: "InvalidData"
  readonly path: Array<string>
  readonly message: string
}

/**
 * @since 2.0.0
 * @category models
 */
export interface MissingData extends ConfigError.Proto {
  readonly _tag: "MissingData"
  readonly path: Array<string>
  readonly message: string
}

/**
 * @since 2.0.0
 * @category models
 */
export interface SourceUnavailable extends ConfigError.Proto {
  readonly _tag: "SourceUnavailable"
  readonly path: Array<string>
  readonly message: string
  readonly cause: Cause.Cause<unknown>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Unsupported extends ConfigError.Proto {
  readonly _tag: "Unsupported"
  readonly path: Array<string>
  readonly message: string
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Options {
  pathDelim: string
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const And: (self: ConfigError, that: ConfigError) => ConfigError = internal.And

/**
 * @since 2.0.0
 * @category constructors
 */
export const Or: (self: ConfigError, that: ConfigError) => ConfigError = internal.Or

/**
 * @since 2.0.0
 * @category constructors
 */
export const MissingData: (path: Array<string>, message: string, options?: Options) => ConfigError =
  internal.MissingData

/**
 * @since 2.0.0
 * @category constructors
 */
export const InvalidData: (path: Array<string>, message: string, options?: Options) => ConfigError =
  internal.InvalidData

/**
 * @since 2.0.0
 * @category constructors
 */
export const SourceUnavailable: (
  path: Array<string>,
  message: string,
  cause: Cause.Cause<unknown>,
  options?: Options
) => ConfigError = internal.SourceUnavailable

/**
 * @since 2.0.0
 * @category constructors
 */
export const Unsupported: (path: Array<string>, message: string, options?: Options) => ConfigError =
  internal.Unsupported

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
