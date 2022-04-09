/**
 * Constructs a computation that always returns the `Unit` value, passing the
 * state through unchanged.
 *
 * @tsplus static ets/Sync/Ops unit
 */
export const unit: Sync<unknown, never, void> = Sync.succeed(() => undefined);
