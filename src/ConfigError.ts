/**
 * @since 2.0.0
 */
import type {
  And,
  ConfigErrorReducer,
  ConfigErrorTypeId,
  InvalidData,
  MissingData,
  Or,
  SourceUnavailable,
  Unsupported
} from "./impl/ConfigError.js"

/**
 * @since 2.0.0
 */
export * from "./impl/ConfigError.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/ConfigError.js"

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

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ConfigError.js"
}
