import { ISync } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 *
 * @tsplus static effect/core/io/Effect.Ops __call
 * @tsplus static effect/core/io/Effect.Ops sync
 */
export function sync<A>(f: LazyArg<A>): Effect<never, never, A> {
  return new ISync(f)
}
