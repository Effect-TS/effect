/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideService
 * @tsplus pipeable effect/core/stream/Channel provideService
 */
export function provideService<T, T1 extends T>(
  tag: Tag<T>,
  service: LazyArg<T1>
) {
  return <R, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Exclude<R, T>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.succeed(service).flatMap((service) =>
      Channel.environment<Exclude<R, T>>().flatMap((env) =>
        self.provideEnvironment(
          env.add(tag, service) as Env<R>
        )
      )
    )
}
