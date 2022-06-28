/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * The finalizer returned from this method will remove the original
 * finalizer from the map and run it.
 *
 * @tsplus static effect/core/io/ReleaseMap.Aspects add
 * @tsplus pipeable effect/core/io/ReleaseMap add
 */
export function add(finalizer: Scope.Finalizer, __tsplusTrace?: string) {
  return (self: ReleaseMap): Effect<never, never, Scope.Finalizer> =>
    self.addIfOpen(finalizer).map((_) =>
      _.fold(
        (): Scope.Finalizer => () => Effect.unit,
        (k): Scope.Finalizer => (e) => self.release(k, e)
      )
    )
}
