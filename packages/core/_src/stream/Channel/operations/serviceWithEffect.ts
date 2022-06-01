/**
 * Accesses the specified service in the environment of the channel in the
 * context of an effect.
 *
 * @tsplus static ets/Channel/Ops serviceWithEffect
 */
export function serviceWithEffect<T>(tag: Tag<T>) {
  return <Env, OutErr, OutDone>(
    f: (resource: T) => Effect<Env, OutErr, OutDone>
  ): Channel<Env | T, unknown, unknown, unknown, OutErr, never, OutDone> => Channel.service(tag).mapEffect(f)
}
