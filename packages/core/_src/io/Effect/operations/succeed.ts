import { ISucceed } from "@effect/core/io/Effect/definition/primitives";

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 *
 * @tsplus static ets/Effect/Ops __call
 * @tsplus static ets/Effect/Ops succeed
 */
export function succeed<A>(f: LazyArg<A>, __tsplusTrace?: string): Effect.UIO<A> {
  return new ISucceed(f, __tsplusTrace);
}
