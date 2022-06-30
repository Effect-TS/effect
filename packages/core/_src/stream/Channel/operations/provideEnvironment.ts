import { Provide } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Provides the channel with its required environment, which eliminates its
 * dependency on `Env`.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stream/Channel provideEnvironment
 */
export function provideEnvironment<R>(env: LazyArg<Env<R>>) {
  return <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<never, InErr, InElem, InDone, OutErr, OutElem, OutDone> => new Provide(env, self)
}
