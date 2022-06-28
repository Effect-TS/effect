// `setTimeout` is limited to take delays which are 32-bit values
const MAX_SET_TIMEOUT_VALUE = 2 ** 31 - 1

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 *
 * @tsplus static effect/core/io/Effect.Ops never
 */
export const never: Effect<never, never, never> = Effect.asyncInterrupt<never, never, never>(() => {
  const interval = setInterval(() => {
    //
  }, MAX_SET_TIMEOUT_VALUE)
  return Either.left(Effect.succeed(clearInterval(interval)))
})
