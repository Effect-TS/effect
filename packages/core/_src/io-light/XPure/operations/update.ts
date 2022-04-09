/**
 * Constructs a computation from the specified update function.
 *
 * @tsplus static ets/XPure/Ops update
 */
export function update<W, S1, S2>(
  f: (s: S1) => S2
): XPure<W, S1, S2, unknown, never, void> {
  return XPure.modify((s) => Tuple(f(s), undefined));
}
