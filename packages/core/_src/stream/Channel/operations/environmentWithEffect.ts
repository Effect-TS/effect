/**
 * Accesses the environment of the channel in the context of an effect.
 *
 * @tsplus static ets/Channel/Ops environmentWithEffect
 */
export function environmentWithEffect<R, R1, OutErr, OutDone>(
  f: (env: Env<R>) => Effect<R1, OutErr, OutDone>
): Channel<R & R1, unknown, unknown, unknown, OutErr, never, OutDone> {
  return Channel.environment<R>().mapEffect(f)
}
