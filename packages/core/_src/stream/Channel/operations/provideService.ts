/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Channel provideService
 */
export function provideService_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  T
>(
  self: Channel<Env & Has<T>, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  service: Service<T>
) {
  return (
    resource: LazyArg<T>,
    __tsplusTrace?: string
  ): Channel<Erase<Env & Has<T>, Has<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.environment<Env>().flatMap((env: Env) => self.provideEnvironment({ ...env, ...service(resource()) }));
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Channel/Aspects provideService
 */
export function provideService<T>(service: Service<T>) {
  return <
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    OutDone
  >(
    self: Channel<Env & Has<T>, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    resource: LazyArg<T>,
    __tsplusTrace?: string
  ): Channel<Erase<Env & Has<T>, Has<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    self.provideService(service)(resource);
}
