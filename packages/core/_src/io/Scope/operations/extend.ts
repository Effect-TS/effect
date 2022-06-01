/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @tsplus fluent ets/Scope extend
 * @tsplus fluent ets/Scope/Closeable extend
 */
export function extend_<R, E, A>(
  self: Scope,
  effect: LazyArg<Effect<R, E, A>>
): Effect<Exclude<R, Scope>, E, A> {
  return Effect.suspendSucceed(
    effect().provideSomeEnvironment((env) => env.merge(Env(Scope.Tag, self) as Env<R>))
  )
}

/**
 * Extends the scope of an `Effect` workflow that needs a scope into this
 * scope by providing it to the workflow but not closing the scope when the
 * workflow completes execution. This allows extending a scoped value into a
 * larger scope.
 *
 * @tsplus static ets/Scope/Aspects extend
 */
export const extend = Pipeable(extend_)
