/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus static effect/core/io/Effect.Aspects absorbWith
 * @tsplus pipeable effect/core/io/Effect absorbWith
 */
export function absorbWith<E>(f: (e: E) => unknown, __tsplusTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, unknown, A> =>
    self
      .sandbox
      .foldEffect((cause) => Effect.fail(cause.squashWith(f)), Effect.succeed)
}
