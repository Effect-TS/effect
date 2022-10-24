import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideService
 * @tsplus pipeable effect/core/stream/Channel provideService
 * @category environment
 * @since 1.0.0
 */
export function provideService<T, T1 extends T>(tag: Context.Tag<T>, service: T1) {
  return <R, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Exclude<R, T>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    Channel.environment<Exclude<R, T>>().flatMap((env) =>
      // @ts-expect-error
      self.provideEnvironment(pipe(env, Context.add(tag)(service)))
    )
}
