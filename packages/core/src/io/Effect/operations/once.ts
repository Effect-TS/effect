import { getAndSet_ } from "../../Ref/operations/getAndSet"
import { make } from "../../Ref/operations/make"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 *
 * @tsplus fluent ets/Effect once
 */
export function once<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): UIO<Effect<R, E, void>> {
  return make(true).map((ref) =>
    Effect.whenEffect(getAndSet_(ref, false), self).asUnit()
  )
}
