/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @tsplus static effect/core/io/Scope.Aspects extend
 * @tsplus pipeable effect/core/io/Scope extend
 * @tsplus pipeable effect/core/io/Scope/Closeable extend
 */
export function extend<R, E, A>(effect: LazyArg<Effect<R, E, A>>) {
  return (self: Scope): Effect<Exclude<R, Scope>, E, A> =>
    Effect.suspendSucceed(
      effect().provideSomeEnvironment((env) => env.merge(Env(Scope.Tag, self) as Env<R>))
    )
}
