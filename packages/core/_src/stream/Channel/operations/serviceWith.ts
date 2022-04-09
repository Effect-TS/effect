/**
 * Accesses the specified service in the environment of the channel.
 *
 * @tsplus static ets/Channel/Ops serviceWith
 */
export function serviceWith<T>(service: Service<T>) {
  return <OutDone>(
    f: (resource: T) => OutDone
  ): Channel<Has<T>, unknown, unknown, unknown, never, never, OutDone> => Channel.service(service).map(f);
}
