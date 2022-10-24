import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideService
 * @tsplus static effect/core/stream/Stream provideService
 * @category environment
 * @since 1.0.0
 */
export function provideService<T, T1 extends T>(tag: Context.Tag<T>, service: T1) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<Exclude<R, T>, E, A> =>
    Stream.environmentWithStream((context: Context.Context<Exclude<R, T>>) =>
      self.provideEnvironment(pipe(context, Context.add(tag)(service)) as Context.Context<R>)
    )
}
