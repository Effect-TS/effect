import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @tsplus static effect/core/io/Scope.Aspects extend
 * @tsplus pipeable effect/core/io/Scope extend
 * @tsplus pipeable effect/core/io/Scope/Closeable extend
 * @category mutations
 * @since 1.0.0
 */
export function extend<R, E, A>(effect: Effect<R, E, A>) {
  return (self: Scope): Effect<Exclude<R, Scope>, E, A> =>
    // @ts-expect-error
    effect.provideSomeEnvironment(Context.merge(pipe(
      Context.empty(),
      Context.add(Scope.Tag)(self)
    )))
}
