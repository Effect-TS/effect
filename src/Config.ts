/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk.js"
import type * as ConfigError from "./ConfigError.js"
import type * as ConfigSecret from "./ConfigSecret.js"
import type * as Either from "./Either.js"
import type { LazyArg } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import type * as HashSet from "./HashSet.js"
import * as internal from "./internal/config.js"
import type * as LogLevel from "./LogLevel.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ConfigTypeId: unique symbol = internal.ConfigTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ConfigTypeId = typeof ConfigTypeId

/**
 * A `Config` describes the structure of some configuration data.
 *
 * @since 2.0.0
 * @category models
 */
export interface Config<A> extends Config.Variance<A>, Pipeable {}

/**
 * @since 2.0.0
 */
export declare namespace Config {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [ConfigTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Primitive<A> extends Config<A> {
    readonly description: string
    parse(text: string): Either.Either<ConfigError.ConfigError, A>
  }

  /**
   * Wraps a nested structure, converting all primitives to a `Config`.
   *
   * `Config.Wrap<{ key: string }>` becomes `{ key: Config<string> }`
   *
   * To create the resulting config, use the `unwrap` constructor.
   *
   * @since 2.0.0
   * @category models
   */
  export type Wrap<A> =
    | (A extends Record<string, any> ? {
        [K in keyof A]: Wrap<A[K]>
      }
      : never)
    | Config<A>
}

/**
 * Constructs a config from a tuple / struct / arguments of configs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const all: <const Arg extends Iterable<Config<any>> | Record<string, Config<any>>>(
  arg: Arg
) => Config<
  [Arg] extends [ReadonlyArray<Config<any>>] ? {
      -readonly [K in keyof Arg]: [Arg[K]] extends [Config<infer A>] ? A : never
    }
    : [Arg] extends [Iterable<Config<infer A>>] ? Array<A>
    : [Arg] extends [Record<string, Config<any>>] ? {
        -readonly [K in keyof Arg]: [Arg[K]] extends [Config<infer A>] ? A : never
      }
    : never
> = internal.all

/**
 * Constructs a config for an array of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const array: <A>(config: Config<A>, name?: string | undefined) => Config<ReadonlyArray<A>> = internal.array

/**
 * Constructs a config for a boolean value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const boolean: (name?: string | undefined) => Config<boolean> = internal.boolean

/**
 * Constructs a config for a sequence of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const chunk: <A>(config: Config<A>, name?: string | undefined) => Config<Chunk.Chunk<A>> = internal.chunk

/**
 * Constructs a config for a date value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const date: (name?: string | undefined) => Config<Date> = internal.date

/**
 * Constructs a config that fails with the specified message.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fail: (message: string) => Config<never> = internal.fail

/**
 * Constructs a config for a float value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const number: (name?: string | undefined) => Config<number> = internal.number

/**
 * Constructs a config for a integer value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const integer: (name?: string | undefined) => Config<number> = internal.integer

/**
 * Constructs a config for a `LogLevel` value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const logLevel: (name?: string | undefined) => Config<LogLevel.LogLevel> = internal.logLevel

/**
 * This function returns `true` if the specified value is an `Config` value,
 * `false` otherwise.
 *
 * This function can be useful for checking the type of a value before
 * attempting to operate on it as an `Config` value. For example, you could
 * use `isConfig` to check the type of a value before using it as an
 * argument to a function that expects an `Config` value.
 *
 * @param u - The value to check for being a `Config` value.
 *
 * @returns `true` if the specified value is a `Config` value, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isConfig: (u: unknown) => u is Config<unknown> = internal.isConfig

/**
 * Returns a  config whose structure is the same as this one, but which produces
 * a different value, constructed using the specified function.
 *
 * @since 2.0.0
 * @category utils
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (a: A) => B): Config<B>
} = internal.map

/**
 * Returns a config whose structure is the same as this one, but which may
 * produce a different value, constructed using the specified function, which
 * may throw exceptions that will be translated into validation errors.
 *
 * @since 2.0.0
 * @category utils
 */
export const mapAttempt: {
  <A, B>(f: (a: A) => B): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (a: A) => B): Config<B>
} = internal.mapAttempt

/**
 * Returns a new config whose structure is the samea as this one, but which
 * may produce a different value, constructed using the specified fallible
 * function.
 *
 * @since 2.0.0
 * @category utils
 */
export const mapOrFail: {
  <A, B>(f: (a: A) => Either.Either<ConfigError.ConfigError, B>): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (a: A) => Either.Either<ConfigError.ConfigError, B>): Config<B>
} = internal.mapOrFail

/**
 * Returns a config that has this configuration nested as a property of the
 * specified name.
 *
 * @since 2.0.0
 * @category utils
 */
export const nested: {
  (name: string): <A>(self: Config<A>) => Config<A>
  <A>(self: Config<A>, name: string): Config<A>
} = internal.nested

/**
 * Returns a config whose structure is preferentially described by this
 * config, but which falls back to the specified config if there is an issue
 * reading from this config.
 *
 * @since 2.0.0
 * @category utils
 */
export const orElse: {
  <A2>(that: LazyArg<Config<A2>>): <A>(self: Config<A>) => Config<A2 | A>
  <A, A2>(self: Config<A>, that: LazyArg<Config<A2>>): Config<A | A2>
} = internal.orElse

/**
 * Returns configuration which reads from this configuration, but which falls
 * back to the specified configuration if reading from this configuration
 * fails with an error satisfying the specified predicate.
 *
 * @since 2.0.0
 * @category utils
 */
export const orElseIf: {
  <A2>(
    options: {
      readonly if: Predicate<ConfigError.ConfigError>
      readonly orElse: LazyArg<Config<A2>>
    }
  ): <A>(self: Config<A>) => Config<A>
  <A, A2>(
    self: Config<A>,
    options: {
      readonly if: Predicate<ConfigError.ConfigError>
      readonly orElse: LazyArg<Config<A2>>
    }
  ): Config<A>
} = internal.orElseIf

/**
 * Returns an optional version of this config, which will be `None` if the
 * data is missing from configuration, and `Some` otherwise.
 *
 * @since 2.0.0
 * @category utils
 */
export const option: <A>(self: Config<A>) => Config<Option.Option<A>> = internal.option

/**
 * Constructs a new primitive config.
 *
 * @since 2.0.0
 * @category constructors
 */
export const primitive: <A>(
  description: string,
  parse: (text: string) => Either.Either<ConfigError.ConfigError, A>
) => Config<A> = internal.primitive

/**
 * Returns a config that describes a sequence of values, each of which has the
 * structure of this config.
 *
 * @since 2.0.0
 * @category utils
 */
export const repeat: <A>(self: Config<A>) => Config<Array<A>> = internal.repeat

/**
 * Constructs a config for a secret value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const secret: (name?: string | undefined) => Config<ConfigSecret.ConfigSecret> = internal.secret

/**
 * Constructs a config for a sequence of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const hashSet: <A>(config: Config<A>, name?: string | undefined) => Config<HashSet.HashSet<A>> = internal.hashSet

/**
 * Constructs a config for a string value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const string: (name?: string | undefined) => Config<string> = internal.string

/**
 * Constructs a config which contains the specified value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Config<A> = internal.succeed

/**
 * Lazily constructs a config.
 *
 * @since 2.0.0
 * @category constructors
 */
export const suspend: <A>(config: LazyArg<Config<A>>) => Config<A> = internal.suspend

/**
 * Constructs a config which contains the specified lazy value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sync: <A>(value: LazyArg<A>) => Config<A> = internal.sync

/**
 * Constructs a config for a sequence of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const hashMap: <A>(config: Config<A>, name?: string | undefined) => Config<HashMap.HashMap<string, A>> =
  internal.hashMap

/**
 * Constructs a config from some configuration wrapped with the `Wrap<A>` utility type.
 *
 * For example:
 *
 * ```
 * import { Config, unwrap } from "./Config"
 *
 * interface Options { key: string }
 *
 * const makeConfig = (config: Config.Wrap<Options>): Config<Options> => unwrap(config)
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const unwrap: <A>(wrapped: Config.Wrap<A>) => Config<A> = internal.unwrap

/**
 * Returns a config that describes the same structure as this one, but which
 * performs validation during loading.
 *
 * @since 2.0.0
 * @category utils
 */
export const validate: {
  <A, B extends A>(
    options: {
      readonly message: string
      readonly validation: Refinement<A, B>
    }
  ): (self: Config<A>) => Config<B>
  <A>(options: {
    readonly message: string
    readonly validation: Predicate<A>
  }): (self: Config<A>) => Config<A>
  <A, B extends A>(
    self: Config<A>,
    options: {
      readonly message: string
      readonly validation: Refinement<A, B>
    }
  ): Config<B>
  <A>(self: Config<A>, options: {
    readonly message: string
    readonly validation: Predicate<A>
  }): Config<A>
} = internal.validate

/**
 * Returns a config that describes the same structure as this one, but has the
 * specified default value in case the information cannot be found.
 *
 * @since 2.0.0
 * @category utils
 */
export const withDefault: {
  <A2>(def: A2): <A>(self: Config<A>) => Config<A2 | A>
  <A, A2>(self: Config<A>, def: A2): Config<A | A2>
} = internal.withDefault

/**
 * Adds a description to this configuration, which is intended for humans.
 *
 * @since 2.0.0
 * @category utils
 */
export const withDescription: {
  (description: string): <A>(self: Config<A>) => Config<A>
  <A>(self: Config<A>, description: string): Config<A>
} = internal.withDescription

/**
 * Returns a config that is the composition of this config and the specified
 * config.
 *
 * @since 2.0.0
 * @category utils
 */
export const zip: {
  <B>(that: Config<B>): <A>(self: Config<A>) => Config<readonly [A, B]>
  <A, B>(self: Config<A>, that: Config<B>): Config<readonly [A, B]>
} = internal.zip

/**
 * Returns a config that is the composes this config and the specified config
 * using the provided function.
 *
 * @since 2.0.0
 * @category utils
 */
export const zipWith: {
  <B, A, C>(that: Config<B>, f: (a: A, b: B) => C): (self: Config<A>) => Config<C>
  <A, B, C>(self: Config<A>, that: Config<B>, f: (a: A, b: B) => C): Config<C>
} = internal.zipWith
