/**
 * Updates a service in the environment of this channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects updateService
 * @tsplus pipeable effect/core/stream/Channel updateService
 */
export function updateService<T, T1 extends T>(
  tag: Tag<T>,
  f: (resource: T) => T1,
  __tsplusTrace?: string
) {
  return <R, InErr, InDone, OutElem, OutErr, OutDone>(
    self: Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>
  ): Channel<R | T, InErr, unknown, InDone, OutErr, OutElem, OutDone> =>
    self.provideSomeEnvironment((env) => env.merge(Env(tag, f(env.unsafeGet(tag)))))
}
