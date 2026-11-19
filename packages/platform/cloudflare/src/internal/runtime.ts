/**
 * The scheduler and tracer the package's entry points run with by default.
 *
 * This module must load outside workerd (Node tests, Alchemy plan time), so it
 * does not import `cloudflare:workers`. A module that only loads in workerd
 * installs the defaults with `setDefaults`.
 *
 * @internal
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Scheduler from "effect/Scheduler"
import * as Tracer from "effect/Tracer"

let make: (() => Context.Context<never>) | undefined
let cached: Context.Context<never> | undefined

/** @internal */
export const setDefaults = (f: () => Context.Context<never>): void => {
  make = f
  cached = undefined
}

/** @internal */
export const defaults = (): Context.Context<never> => cached ??= make === undefined ? Context.empty() : make()

/** @internal */
export const layer: Layer.Layer<never> = Layer.effectContext(Effect.contextWith((ambient: Context.Context<never>) => {
  let context = defaults()
  if (Context.get(ambient, Scheduler.Scheduler) !== Context.get(Context.empty(), Scheduler.Scheduler)) {
    context = Context.omit(Scheduler.Scheduler)(context) as any
  }
  if (Context.getOrUndefinedUnsafe(ambient, Tracer.TracerKey) !== undefined) {
    context = Context.omit(Tracer.Tracer)(context) as any
  }
  return Effect.succeed(context)
}))

/** @internal */
export const runPromise = <A, E>(effect: Effect.Effect<A, E>, options?: Effect.RunOptions): Promise<A> =>
  Effect.runPromiseWith(defaults())(effect, options)

/** @internal */
export const runFork = <A, E>(effect: Effect.Effect<A, E>, options?: Effect.RunOptions): Fiber.Fiber<A, E> =>
  Effect.runForkWith(defaults())(effect, options)
