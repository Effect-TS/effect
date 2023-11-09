import type { Config } from "./Config.js"
import type { ConfigError } from "./ConfigError.js"
import type { ConfigProviderPathPatch } from "./ConfigProviderPathPatch.js"
import type { Effect } from "./Effect.js"
import type { HashSet } from "./HashSet.js"
import type { ConfigProviderTypeId, FlatConfigProviderTypeId } from "./impl/ConfigProvider.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/ConfigProvider.js"
export * from "./internal/Jumpers/ConfigProvider.js"

/**
 * A ConfigProvider is a service that provides configuration given a description
 * of the structure of that configuration.
 *
 * @since 2.0.0
 * @category models
 */
export interface ConfigProvider extends ConfigProvider.Proto, Pipeable {
  /**
   * Loads the specified configuration, or fails with a config error.
   */
  load<A>(config: Config<A>): Effect<never, ConfigError, A>
  /**
   * Flattens this config provider into a simplified config provider that knows
   * only how to deal with flat (key/value) properties.
   */
  flattened: ConfigProvider.Flat
}

/**
 * @since 2.0.0
 */
export declare namespace ConfigProvider {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [ConfigProviderTypeId]: ConfigProviderTypeId
  }

  /**
   * A simplified config provider that knows only how to deal with flat
   * (key/value) properties. Because these providers are common, there is
   * special support for implementing them.
   *
   * @since 2.0.0
   * @category models
   */
  export interface Flat {
    readonly [FlatConfigProviderTypeId]: FlatConfigProviderTypeId
    patch: ConfigProviderPathPatch
    load<A>(
      path: ReadonlyArray<string>,
      config: Config.Primitive<A>,
      split?: boolean
    ): Effect<never, ConfigError, ReadonlyArray<A>>
    enumerateChildren(
      path: ReadonlyArray<string>
    ): Effect<never, ConfigError, HashSet<string>>
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface FromMapConfig {
    readonly pathDelim: string
    readonly seqDelim: string
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface FromEnvConfig {
    readonly pathDelim: string
    readonly seqDelim: string
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ConfigProvider.js"
}
