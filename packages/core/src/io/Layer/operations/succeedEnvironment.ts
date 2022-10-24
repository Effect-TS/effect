import type { Context } from "@fp-ts/data/Context"

/**
 * Constructs a layer from the specified value, which must return one or more
 * services.
 *
 * @tsplus static effect/core/io/Layer.Ops succeedEnvironment
 * @category constructors
 * @since 1.0.0
 */
export function succeedEnvironment<A>(a: Context<A>): Layer<never, never, A> {
  return Layer.fromEffectEnvironment(Effect.succeed(a))
}
