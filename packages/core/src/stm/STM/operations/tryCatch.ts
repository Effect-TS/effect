/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @tsplus static effect/core/stm/STM.Ops tryCatch
 */
export function tryCatch<E, A>(
  attempt: LazyArg<A>,
  onThrow: (u: unknown) => E
): STM<never, E, A> {
  return STM.suspend(() => {
    try {
      return STM.succeed(attempt())
    } catch (error) {
      return STM.failSync(onThrow(error))
    }
  })
}
