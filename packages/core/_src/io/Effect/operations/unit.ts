/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static ets/Effect/Ops unit
 */
export const unit: Effect.UIO<void> = Effect.succeedNow(undefined)

/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static ets/Effect/Ops unitTraced
 */
export function unitTraced(__tsplusTrace?: string): Effect.UIO<void> {
  return Effect.succeedNow(undefined)
}
