import type * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import * as internal from "../internal/reloadable.js"
import type * as Layer from "../Layer.js"
import type { Reloadable } from "../Reloadable.js"
import type * as Schedule from "../Schedule.js"

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
