/**
 * Returns a new effect that ignores the success or failure of this effect,
 * but which also logs failures at the Debug level, just in case the failure
 * turns out to be important.
 *
 * @tsplus getter effect/core/io/Effect ignoreLogged
 * @category mutations
 * @since 1.0.0
 */
export function ignoreLogged<R, E, A>(self: Effect<R, E, A>): Effect<R, never, void> {
  return self.foldCause(
    (cause) =>
      Effect.logDebugCauseMessage(
        "An error was silently ignored because it is not anticipated to be useful",
        cause
      ),
    () => Effect.unit
  )
}
