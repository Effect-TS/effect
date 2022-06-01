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
  T,
  T1 extends T
>(
  self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  tag: Tag<T>,
  service: LazyArg<T1>,
  __tsplusTrace?: string
): Channel<Exclude<R, T>, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return Channel.succeed(service).flatMap((service) =>
    Channel.environment<Exclude<R, T>>().flatMap((env) => self.provideEnvironment(env.add(tag, service) as Env<R>))
  )
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Channel/Aspects provideService
 */
export const provideService = Pipeable(provideService_)
