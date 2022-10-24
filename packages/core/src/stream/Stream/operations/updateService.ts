import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects updateService
 * @tsplus pipeable effect/core/stream/Stream updateService
 * @category environment
 * @since 1.0.0
 */
export function updateService<T, T1 extends T>(
  tag: Context.Tag<T>,
  f: (service: T) => T1
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | T, E, A> =>
    self.provideSomeEnvironment((context) =>
      pipe(
        context,
        Context.add(tag)(f(
          pipe(
            context,
            Context.unsafeGet(tag)
          )
        ))
      )
    )
}
