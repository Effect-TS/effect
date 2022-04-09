/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. When no environment is required (i.e., when `R == unknown`) it is
 * conceptually equivalent to `flatten(succeedWith(io))`.
 *
 * @tsplus static ets/Effect/Ops suspendWith
 */
export function suspendWith<R, A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => RIO<R, A>,
  __tsplusTrace?: string
): RIO<R, A> {
  return Effect.suspendSucceedWith((runtimeConfig, fiberId) => {
    try {
      return f(runtimeConfig, fiberId);
    } catch (error) {
      if (!runtimeConfig.value.fatal(error)) {
        throw new EffectError(Exit.fail(error), __tsplusTrace);
      }
      throw error;
    }
  });
}
