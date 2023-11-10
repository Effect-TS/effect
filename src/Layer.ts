/**
 * A `Layer<RIn, E, ROut>` describes how to build one or more services in your
 * application. Services can be injected into effects via
 * `Effect.provideService`. Effects can require services via `Effect.service`.
 *
 * Layer can be thought of as recipes for producing bundles of services, given
 * their dependencies (other services).
 *
 * Construction of services can be effectful and utilize resources that must be
 * acquired and safely released when the services are done being utilized.
 *
 * By default layers are shared, meaning that if the same layer is used twice
 * the layer will only be allocated a single time.
 *
 * Because of their excellent composition properties, layers are the idiomatic
 * way in Effect-TS to create services that depend on other services.
 *
 * @since 2.0.0
 */

/**
 * @since 2.0.0
 */
import type { LayerTypeId } from "./impl/Layer.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Layer.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Layer.js"

/**
 * @since 2.0.0
 */
export declare namespace Layer {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Layer.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Layer<RIn, E, ROut> extends Layer.Variance<RIn, E, ROut>, Pipeable {}

/**
 * @since 2.0.0
 */
export declare namespace Layer {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<RIn, E, ROut> {
    readonly [LayerTypeId]: {
      readonly _RIn: (_: never) => RIn
      readonly _E: (_: never) => E
      readonly _ROut: (_: ROut) => void
    }
  }
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Context<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _R
    : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _E : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _A
    : never
}
