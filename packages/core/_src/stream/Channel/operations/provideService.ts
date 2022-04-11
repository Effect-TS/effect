/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Channel provideService
 */
export function provideService_<
  R,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  T
>(
  self: Channel<R & Has<T>, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  tag: Tag<T>
) {
  return (
    service: LazyArg<T>,
    __tsplusTrace?: string
  ): Channel<Erase<R & Has<T>, Has<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.succeed(service).flatMap((service) =>
      Channel.environment<R>().flatMap((env: Env<R>) => self.provideEnvironment(env.add(tag, service)))
    );
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Channel/Aspects provideService
 */
export function provideService<T>(tag: Tag<T>) {
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
    service: LazyArg<T>,
    __tsplusTrace?: string
  ): Channel<Erase<Env & Has<T>, Has<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    self.provideService(tag)(service);
}
