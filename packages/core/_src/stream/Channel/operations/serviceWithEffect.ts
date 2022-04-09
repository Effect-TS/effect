/**
 * Accesses the specified service in the environment of the channel in the
 * context of an effect.
 *
 * @tsplus static ets/Channel/Ops serviceWithEffect
 */
export function serviceWithEffect<T>(service: Service<T>) {
  return <Env, OutErr, OutDone>(
    f: (resource: T) => Effect<Env, OutErr, OutDone>
  ): Channel<Env & Has<T>, unknown, unknown, unknown, OutErr, never, OutDone> => Channel.service(service).mapEffect(f);
}
