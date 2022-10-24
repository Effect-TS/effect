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
 * @category mutations
 * @since 1.0.0
 */
export function add(finalizer: Scope.Finalizer) {
  return (self: ReleaseMap): Effect<never, never, Scope.Finalizer> =>
    self.addIfOpen(finalizer).map((option) => {
      switch (option._tag) {
        case "None": {
          return () => Effect.unit
        }
        case "Some": {
          return (exit) => self.release(option.value, exit)
        }
      }
    })
}
