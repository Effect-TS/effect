import type { Effect, UIO } from "../definition"
import * as Ref from "./excl-deps-ref"
import { map_ } from "./map"
import { whenEffect_ } from "./whenEffect"

/**
 * Returns an effect that will be executed at most once, even if it is
 * evaluated multiple times.
 */
export function once<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): UIO<Effect<R, E, void>> {
  return map_(Ref.make(true), (ref) =>
    map_(whenEffect_(self, Ref.getAndSet_(ref, false)), () => undefined, __trace)
  )
}
