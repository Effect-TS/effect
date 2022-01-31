import { getAndSet_ } from "../../Ref/operations/getAndSet"
import { make } from "../../Ref/operations/make"
import type { Effect, UIO } from "../definition"

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @ets fluent ets/Effect once
 */
export function once<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): UIO<Effect<R, E, void>> {
  return make(true).map((ref) =>
    self.whenEffect(getAndSet_(ref, false)).map(() => undefined)
  )
}
