import type { Context } from "@fp-ts/data/Context"

/**
 * Transforms the environment being provided to the channel with the specified
 * function.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/stream/Channel provideSomeEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideSomeEnvironment<R0, R>(f: (env: Context<R0>) => Context<R>) {
  return <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<R0, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.environmentWithChannel((context: Context<R0>) => self.provideEnvironment(f(context)))
}
