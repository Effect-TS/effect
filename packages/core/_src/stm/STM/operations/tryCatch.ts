/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @tsplus static ets/STM/Ops tryCatch
 */
export function tryCatch<E, A>(
  attempt: LazyArg<A>,
  onThrow: (u: unknown) => E
): STM<unknown, E, A> {
  return STM.suspend(() => {
    try {
      return STM.succeed(attempt);
    } catch (error) {
      return STM.fail(onThrow(error));
    }
  });
}
