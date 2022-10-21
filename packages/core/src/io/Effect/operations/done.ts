/**
 * Returns an effect from a `Exit` value.
 *
 * @tsplus static effect/core/io/Effect.Ops done
 */
export function done<E, A>(exit: Exit<E, A>): Effect<never, E, A> {
  return exit._tag === "Success"
    ? Effect.succeed(exit.value)
    : Effect.failCause(exit.cause)
}
