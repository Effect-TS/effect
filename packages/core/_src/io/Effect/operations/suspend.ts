/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. When no environment is required (i.e., when `R == unknown`) it is
 * conceptually equivalent to `flatten(succeed(io))`.
 *
 * @tsplus static ets/Effect/Ops suspend
 */
export function suspend<R, E, A>(
  f: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, unknown, A> {
  return Effect.suspendSucceedWith((runtimeConfig) => {
    try {
      return f();
    } catch (error) {
      if (!runtimeConfig.value.fatal(error)) {
        throw new Effect.Error(Exit.fail(error), __tsplusTrace);
      }
      throw error;
    }
  });
}
