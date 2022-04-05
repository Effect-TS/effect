/**
 * Lift a sync (non failable) computation.
 *
 * @tsplus static ets/Sync/Ops tryCatch
 */
export function tryCatch<A, E>(
  f: LazyArg<A>,
  onThrow: (u: unknown) => E
): Sync<unknown, E, A> {
  return XPure.tryCatch(f, onThrow);
}
