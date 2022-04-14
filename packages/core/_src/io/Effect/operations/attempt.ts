/**
 * Imports a synchronous side-effect into a pure `Effect` value, translating any
 * thrown exceptions into typed failed effects creating with `Effect.fail`.
 *
 * @tsplus static ets/Effect/Ops attempt
 */
export function attempt<A>(
  f: LazyArg<A>,
  __tsplusTrace?: string
): Effect<unknown, unknown, A> {
  return Effect.succeedWith((runtimeConfig) => {
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
