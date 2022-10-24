import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Updates a service in the environment of this channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects updateService
 * @tsplus pipeable effect/core/stream/Channel updateService
 * @category environment
 * @since 1.0.0
 */
export function updateService<T, T1 extends T>(
  tag: Context.Tag<T>,
  f: (resource: T) => T1
) {
  return <R, InErr, InDone, OutElem, OutErr, OutDone>(
    self: Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>
  ): Channel<R | T, InErr, unknown, InDone, OutErr, OutElem, OutDone> =>
    self.provideSomeEnvironment((env) =>
      pipe(
        env,
        Context.merge(pipe(
          Context.empty(),
          Context.add(tag)(f(pipe(env, Context.unsafeGet(tag))))
        ))
      )
    )
}
