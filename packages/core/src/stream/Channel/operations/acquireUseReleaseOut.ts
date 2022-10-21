/**
 * @tsplus static effect/core/stream/Channel.Ops acquireUseReleaseOut
 */
export function acquireUseReleaseOut<Env, OutErr, Acquired, Z>(
  acquire: Effect<Env, OutErr, Acquired>,
  release: (a: Acquired) => Effect<Env, never, Z>
): Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return Channel.acquireUseReleaseOutExit(acquire, (z, _) => release(z))
}
