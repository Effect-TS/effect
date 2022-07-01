import { OpSync } from "@effect/core/stable/Effect/definition"

/**
 * @tsplus static Effectect/core/stable/Effect.Ops sync
 */
export function sync<A>(evaluate: () => A): Effect2<never, never, A> {
  return new OpSync(evaluate)
}
