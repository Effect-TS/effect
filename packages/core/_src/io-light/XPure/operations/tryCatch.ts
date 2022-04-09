/**
 * Lift a sync (non failable) computation.
 *
 * @tsplus static ets/XPure/Ops tryCatch
 */
export function tryCatch<A, E>(
  f: LazyArg<A>,
  onThrow: (u: unknown) => E
): XPure<never, unknown, unknown, unknown, E, A> {
  return XPure.suspend(() => {
    try {
      return XPure.succeed(f);
    } catch (u) {
      return XPure.fail(onThrow(u));
    }
  });
}
