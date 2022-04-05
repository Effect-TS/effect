import { Suspend } from "@effect-ts/core/io-light/XPure/definition/primitives";

/**
 * Suspend a computation, useful in recursion.
 *
 * @tsplus static ets/XPure/Ops suspend
 */
export function suspend<W, S1, S2, R, E, A>(
  f: LazyArg<XPure<W, S1, S2, R, E, A>>
): XPure<W, S1, S2, R, E, A> {
  return new Suspend(f);
}
