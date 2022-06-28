import { ISucceed } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 *
 * @tsplus static effect/core/io/Effect.Ops __call
 * @tsplus static effect/core/io/Effect.Ops succeed
 */
export function succeed<A>(f: LazyArg<A>, __tsplusTrace?: string): Effect<never, never, A> {
  return new ISucceed(f, __tsplusTrace)
}
