import { Succeed } from "@effect/core/io-light/XPure/definition/primitives";

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/XPure/Ops succeed
 */
export function succeed<S, A>(a: LazyArg<A>): XPure<never, S, S, unknown, never, A> {
  return new Succeed(a);
}
