/**
 * Updates a service in the environment of this channel.
 *
 * @tsplus fluent ets/Channel updateService
 */
export function updateService_<R, InErr, InDone, OutElem, OutErr, OutDone, T>(
  self: Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
  tag: Tag<T>
) {
  return (
    f: (resource: T) => T,
    __tsplusTrace?: string
  ): Channel<R & Has<T>, InErr, unknown, InDone, OutErr, OutElem, OutDone> =>
    self.provideSomeEnvironment((env) => env.merge(Env().add(tag, f(env.get(tag)))));
}

/**
 * Updates a service in the environment of this channel.
 */
export function updateService<T>(tag: Tag<T>) {
  return <R, InErr, InDone, OutElem, OutErr, OutDone>(
    self: Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
    f: (resource: T) => T,
    __tsplusTrace?: string
  ): Channel<R & Has<T>, InErr, unknown, InDone, OutErr, OutElem, OutDone> => self.updateService(tag)(f);
}
