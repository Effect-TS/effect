/**
 * Updates a service in the environment of this channel.
 *
 * @tsplus fluent ets/Channel updateService
 */
export function updateService_<R, InErr, InDone, OutElem, OutErr, OutDone, T, T1 extends T>(
  self: Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
  tag: Tag<T>,
  f: (resource: T) => T1,
  __tsplusTrace?: string
): Channel<R | T, InErr, unknown, InDone, OutErr, OutElem, OutDone> {
  return self.provideSomeEnvironment((env) => env.merge(Env(tag, f(env.unsafeGet(tag)))))
}

/**
 * Updates a service in the environment of this channel.
 */
export const updateService = Pipeable(updateService_)
