import { Provide } from "@effect/core/stream/Channel/definition/primitives"
import type { Context } from "@fp-ts/data/Context"

/**
 * Provides the channel with its required environment, which eliminates its
 * dependency on `Env`.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stream/Channel provideEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideEnvironment<R>(context: Context<R>) {
  return <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<never, InErr, InElem, InDone, OutErr, OutElem, OutDone> => new Provide(context, self)
}
