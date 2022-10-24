import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Makes an explicit check to see if the fiber has been interrupted, and if
 * so, performs self-interruption
 *
 * @tsplus static effect/core/io/Effect.Ops allowInterrupt
 * @category mutations
 * @since 1.0.0
 */
export const allowInterrupt: Effect<never, never, void> = Effect.descriptorWith((descriptor) =>
  HashSet.size(descriptor.interrupters) > 0 ? Effect.interrupt : Effect.unit
)
