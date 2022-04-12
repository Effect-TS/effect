/**
 * Access the environment monadically.
 *
 * @tsplus static ets/Sync/Ops environmentWithSync
 */
export function environmentWithSync<R, R1, E, A>(
  f: (env: Env<R>) => Sync<R1, E, A>
): Sync<R1 & R, E, A> {
  return XPure.environmentWithXPure(f);
}
