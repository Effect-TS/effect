/**
 * Returns an effect from a `Exit` value.
 *
 * @tsplus static effect/core/io/Effect.Ops done
 */
export function done<E, A>(exit: LazyArg<Exit<E, A>>): Effect<never, E, A> {
  return Effect.suspendSucceed(() => {
    const exit0 = exit()
    return exit0._tag === "Success"
      ? Effect.succeed(exit0.value)
      : Effect.failCause(exit0.cause)
  })
}
