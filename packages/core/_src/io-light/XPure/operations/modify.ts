import { Modify } from "@effect-ts/core/io-light/XPure/definition/primitives";

/**
 * Constructs a computation from the specified modify function.
 *
 * @tsplus static ets/XPure/Ops modify
 */
export function modify<S1, S2, A>(
  f: (s: S1) => Tuple<[S2, A]>
): XPure<never, S1, S2, unknown, never, A> {
  return new Modify(f);
}
