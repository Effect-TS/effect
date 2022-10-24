import type { Context } from "@fp-ts/data/Context"

/**
 * Lazily constructs a layer from the specified value, which must return one or more
 * services.
 *
 * @tsplus static effect/core/io/Layer.Ops syncEnvironment
 * @category constructors
 * @since 1.0.0
 */
export function syncEnvironment<A>(a: LazyArg<Context<A>>): Layer<never, never, A> {
  return Layer.fromEffectEnvironment(Effect.sync(a))
}
