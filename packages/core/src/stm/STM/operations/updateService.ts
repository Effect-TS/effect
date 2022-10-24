import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static effect/core/stm/STM.Aspects updateService
 * @tsplus pipeable effect/core/stm/STM updateService
 * @category environment
 * @since 1.0.0
 */
export function updateService<T, T1 extends T>(tag: Context.Tag<T>, f: (service: T) => T1) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | T, E, A> =>
    self.provideSomeEnvironment((env) =>
      pipe(
        env,
        Context.merge(pipe(
          Context.empty(),
          Context.add(tag)(f(pipe(
            env,
            Context.unsafeGet(tag)
          )))
        ))
      )
    )
}
