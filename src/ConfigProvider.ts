/**
 * @since 2.0.0
 */
import type * as Config from "./Config.js"
import type * as ConfigError from "./ConfigError.js"
import type * as PathPatch from "./ConfigProviderPathPatch.js"
import type * as Context from "./Context.js"
import type * as Effect from "./Effect.js"
import type { LazyArg } from "./Function.js"
import type * as HashSet from "./HashSet.js"
import * as internal from "./internal/configProvider.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ConfigProviderTypeId: unique symbol = internal.ConfigProviderTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ConfigProviderTypeId = typeof ConfigProviderTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const FlatConfigProviderTypeId: unique symbol = internal.FlatConfigProviderTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type FlatConfigProviderTypeId = typeof FlatConfigProviderTypeId

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
  load<A>(config: Config.Config<A>): Effect.Effect<never, ConfigError.ConfigError, A>
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
    patch: PathPatch.PathPatch
    load<A>(
      path: ReadonlyArray<string>,
      config: Config.Config.Primitive<A>,
      split?: boolean
    ): Effect.Effect<never, ConfigError.ConfigError, ReadonlyArray<A>>
    enumerateChildren(
      path: ReadonlyArray<string>
    ): Effect.Effect<never, ConfigError.ConfigError, HashSet.HashSet<string>>
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
}

/**
 * The service tag for `ConfigProvider`.
 *
 * @since 2.0.0
 * @category context
 */
export const ConfigProvider: Context.Tag<ConfigProvider, ConfigProvider> = internal.configProviderTag

/**
 * Creates a new config provider.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: (
  options: {
    readonly load: <A>(config: Config.Config<A>) => Effect.Effect<never, ConfigError.ConfigError, A>
    readonly flattened: ConfigProvider.Flat
  }
) => ConfigProvider = internal.make

/**
 * Creates a new flat config provider.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeFlat: (options: {
  readonly load: <A>(
    path: ReadonlyArray<string>,
    config: Config.Config.Primitive<A>,
    split: boolean
  ) => Effect.Effect<never, ConfigError.ConfigError, ReadonlyArray<A>>
  readonly enumerateChildren: (
    path: ReadonlyArray<string>
  ) => Effect.Effect<never, ConfigError.ConfigError, HashSet.HashSet<string>>
  readonly patch: PathPatch.PathPatch
}) => ConfigProvider.Flat = internal.makeFlat

/**
 * A config provider that loads configuration from context variables,
 * using the default System service.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEnv: (config?: ConfigProvider.FromEnvConfig) => ConfigProvider = internal.fromEnv

/**
 * Constructs a new `ConfigProvider` from a key/value (flat) provider, where
 * nesting is embedded into the string keys.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromFlat: (flat: ConfigProvider.Flat) => ConfigProvider = internal.fromFlat

/**
 * Constructs a ConfigProvider using a map and the specified delimiter string,
 * which determines how to split the keys in the map into path segments.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromMap: (map: Map<string, string>, config?: Partial<ConfigProvider.FromMapConfig>) => ConfigProvider =
  internal.fromMap

/**
 * Returns a new config provider that will automatically convert all property
 * names to constant case. This can be utilized to adapt the names of
 * configuration properties from the default naming convention of camel case
 * to the naming convention of a config provider.
 *
 * @since 2.0.0
 * @category combinators
 */
export const constantCase: (self: ConfigProvider) => ConfigProvider = internal.constantCase

/**
 * Returns a new config provider that will automatically tranform all path
 * configuration names with the specified function. This can be utilized to
 * adapt the names of configuration properties from one naming convention to
 * another.
 *
 * @since 2.0.0
 * @category utils
 */
export const mapInputPath: {
  (f: (path: string) => string): (self: ConfigProvider) => ConfigProvider
  (self: ConfigProvider, f: (path: string) => string): ConfigProvider
} = internal.mapInputPath

/**
 * Returns a new config provider that will automatically convert all property
 * names to kebab case. This can be utilized to adapt the names of
 * configuration properties from the default naming convention of camel case
 * to the naming convention of a config provider.
 *
 * @since 2.0.0
 * @category combinators
 */
export const kebabCase: (self: ConfigProvider) => ConfigProvider = internal.kebabCase

/**
 * Returns a new config provider that will automatically convert all property
 * names to lower case. This can be utilized to adapt the names of
 * configuration properties from the default naming convention of camel case
 * to the naming convention of a config provider.
 *
 * @since 2.0.0
 * @category combinators
 */
export const lowerCase: (self: ConfigProvider) => ConfigProvider = internal.lowerCase

/**
 * Returns a new config provider that will automatically nest all
 * configuration under the specified property name. This can be utilized to
 * aggregate separate configuration sources that are all required to load a
 * single configuration value.
 *
 * @since 2.0.0
 * @category utils
 */
export const nested: {
  (name: string): (self: ConfigProvider) => ConfigProvider
  (self: ConfigProvider, name: string): ConfigProvider
} = internal.nested

/**
 * Returns a new config provider that preferentially loads configuration data
 * from this one, but which will fall back to the specified alternate provider
 * if there are any issues loading the configuration from this provider.
 *
 * @since 2.0.0
 * @category utils
 */
export const orElse: {
  (that: LazyArg<ConfigProvider>): (self: ConfigProvider) => ConfigProvider
  (self: ConfigProvider, that: LazyArg<ConfigProvider>): ConfigProvider
} = internal.orElse

/**
 * Returns a new config provider that will automatically un-nest all
 * configuration under the specified property name. This can be utilized to
 * de-aggregate separate configuration sources that are all required to load a
 * single configuration value.
 *
 * @since 2.0.0
 * @category utils
 */
export const unnested: {
  (name: string): (self: ConfigProvider) => ConfigProvider
  (self: ConfigProvider, name: string): ConfigProvider
} = internal.unnested

/**
 * Returns a new config provider that will automatically convert all property
 * names to upper case. This can be utilized to adapt the names of
 * configuration properties from the default naming convention of camel case
 * to the naming convention of a config provider.
 *
 * @since 2.0.0
 * @category combinators
 */
export const snakeCase: (self: ConfigProvider) => ConfigProvider = internal.snakeCase

/**
 * Returns a new config provider that will automatically convert all property
 * names to upper case. This can be utilized to adapt the names of
 * configuration properties from the default naming convention of camel case
 * to the naming convention of a config provider.
 *
 * @since 2.0.0
 * @category combinators
 */
export const upperCase: (self: ConfigProvider) => ConfigProvider = internal.upperCase

/**
 * Returns a new config provider that transforms the config provider with the
 * specified function within the specified path.
 *
 * @since 2.0.0
 * @category combinators
 */
export const within: {
  (path: ReadonlyArray<string>, f: (self: ConfigProvider) => ConfigProvider): (self: ConfigProvider) => ConfigProvider
  (self: ConfigProvider, path: ReadonlyArray<string>, f: (self: ConfigProvider) => ConfigProvider): ConfigProvider
} = internal.within
