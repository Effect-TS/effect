/**
 * @tsplus static ets/Channel/Ops acquireUseReleaseOut
 */
export function acquireUseReleaseOut<Env, OutErr, Acquired, Z>(
  acquire: Effect<Env, OutErr, Acquired>,
  release: (a: Acquired) => Effect.RIO<Env, Z>
): Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return Channel.acquireUseReleaseOutExit(acquire, (z, _) => release(z));
}
