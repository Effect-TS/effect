/**
 * Updates a service in the environment of this channel.
 *
 * @tsplus fluent ets/Channel updateService
 */
export function updateService_<Env, InErr, InDone, OutElem, OutErr, OutDone, T>(
  self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
  service: Service<T>
) {
  return (
    f: (resource: T) => T,
    __tsplusTrace?: string
  ): Channel<Env & Has<T>, InErr, unknown, InDone, OutErr, OutElem, OutDone> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...service(f(service.get(r))) }));
}

/**
 * Updates a service in the environment of this channel.
 */
export function updateService<T>(service: Service<T>) {
  return <Env, InErr, InDone, OutElem, OutErr, OutDone>(
    self: Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
    f: (resource: T) => T,
    __tsplusTrace?: string
  ): Channel<Env & Has<T>, InErr, unknown, InDone, OutErr, OutElem, OutDone> => self.updateService(service)(f);
}
