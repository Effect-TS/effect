/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * The finalizer returned from this method will remove the original
 * finalizer from the map and run it.
 *
 * @tsplus fluent ets/ReleaseMap add
 */
export function add_(
  self: ReleaseMap,
  finalizer: Finalizer,
  __tsplusTrace?: string
): UIO<Finalizer> {
  return self.addIfOpen(finalizer).map((_) =>
    _.fold(
      (): Finalizer => () => Effect.unit,
      (k): Finalizer => (e) => self.release(k, e)
    )
  );
}

/**
 * Adds a finalizer to the finalizers associated with this scope. If the
 * finalizers associated with this scope have already been run this
 * finalizer will be run immediately.
 *
 * The finalizer returned from this method will remove the original
 * finalizer from the map and run it.
 *
 * @tsplus static ets/ReleaseMap/Aspects add
 */
export const add = Pipeable(add_);
