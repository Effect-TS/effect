import { Fail } from "@effect/core/io-light/XPure/definition/primitives";

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/XPure/Ops fail
 */
export function fail<E>(
  e: LazyArg<E>
): XPure<never, unknown, never, unknown, E, never> {
  return new Fail(e);
}
