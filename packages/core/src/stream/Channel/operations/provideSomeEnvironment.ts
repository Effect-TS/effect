/**
 * Transforms the environment being provided to the channel with the specified
 * function.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/stream/Channel provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: (env: Env<R0>) => Env<R>) {
  return <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<R0, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.environmentWithChannel((env: Env<R0>) => self.provideEnvironment(f(env)))
}
