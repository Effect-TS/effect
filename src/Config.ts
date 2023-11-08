import type { ConfigTypeId } from "./Config.impl.js"
import type { ConfigError } from "./ConfigError.js"
import type { Either } from "./Either.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./Config.impl.js"
export * from "./internal/Jumpers/Config.js"

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
    parse(text: string): Either<ConfigError, A>
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

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Config.impl.js"
}
