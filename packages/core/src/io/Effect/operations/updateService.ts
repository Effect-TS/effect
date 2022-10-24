import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static effect/core/io/Effect.Aspects updateService
 * @tsplus pipeable effect/core/io/Effect updateService
 * @category environment
 * @since 1.0.0
 */
export function updateService<T, T1 extends T>(tag: Context.Tag<T>, f: (_: T) => T1) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | T, E, A> =>
    self.provideSomeEnvironment((env) =>
      pipe(env, Context.add(tag)(f(pipe(env, Context.unsafeGet(tag)))))
    )
}
