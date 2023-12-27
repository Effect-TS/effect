/**
 * @since 2.0.0
 */
import type * as Context from "./Context.js"
import type * as Effect from "./Effect.js"
import * as internal from "./internal/reloadable.js"
import type * as Layer from "./Layer.js"
import type * as Schedule from "./Schedule.js"
import type * as ScopedRef from "./ScopedRef.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ReloadableTypeId: unique symbol = internal.ReloadableTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ReloadableTypeId = typeof ReloadableTypeId

/**
 * A `Reloadable` is an implementation of some service that can be dynamically
 * reloaded, or swapped out for another implementation on-the-fly.
 *
 * @since 2.0.0
 * @category models
 */
export interface Reloadable<in out A> extends Reloadable.Variance<A> {
  /**
   * @internal
   */
  readonly scopedRef: ScopedRef.ScopedRef<A>
  /**
   * @internal
   */
  readonly reload: Effect.Effect<never, unknown, void>
}

/**
 * @since 2.0.0
 */
export declare namespace Reloadable {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out A> {
    readonly [ReloadableTypeId]: {
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to the
 * provided schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const auto: <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
    readonly schedule: Schedule.Schedule<R, unknown, unknown>
  }
) => Layer.Layer<In | R, E, Reloadable<Context.Tag.Identifier<Out>>> = internal.auto

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service. The service is automatically reloaded according to a
 * schedule, which is extracted from the input to the layer.
 *
 * @since 2.0.0
 * @category constructors
 */
export const autoFromConfig: <Out extends Context.Tag<any, any>, In, E, R>(
  tag: Out,
  options: {
    readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>>
    readonly scheduleFromConfig: (context: Context.Context<In>) => Schedule.Schedule<R, unknown, unknown>
  }
) => Layer.Layer<In | R, E, Reloadable<Context.Tag.Identifier<Out>>> = internal.autoFromConfig

/**
 * Retrieves the current version of the reloadable service.
 *
 * @since 2.0.0
 * @category getters
 */
export const get: <T extends Context.Tag<any, any>>(
  tag: T
) => Effect.Effect<Reloadable<Context.Tag.Identifier<T>>, never, Context.Tag.Service<T>> = internal.get

/**
 * Makes a new reloadable service from a layer that describes the construction
 * of a static service.
 *
 * @since 2.0.0
 * @category constructors
 */
export const manual: <Out extends Context.Tag<any, any>, In, E>(
  tag: Out,
  options: { readonly layer: Layer.Layer<In, E, Context.Tag.Identifier<Out>> }
) => Layer.Layer<In, E, Reloadable<Context.Tag.Identifier<Out>>> = internal.manual

/**
 * Reloads the specified service.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reload: <T extends Context.Tag<any, any>>(
  tag: T
) => Effect.Effect<Reloadable<Context.Tag.Identifier<T>>, unknown, void> = internal.reload

/**
 * @since 2.0.0
 * @category context
 */
export const tag: <T extends Context.Tag<any, any>>(
  tag: T
) => Context.Tag<Reloadable<Context.Tag.Identifier<T>>, Reloadable<Context.Tag.Service<T>>> = internal.reloadableTag

/**
 * Forks the reload of the service in the background, ignoring any errors.
 *
 * @since 2.0.0
 * @category constructors
 */
export const reloadFork: <T extends Context.Tag<any, any>>(
  tag: T
) => Effect.Effect<Reloadable<Context.Tag.Identifier<T>>, unknown, void> = internal.reloadFork
