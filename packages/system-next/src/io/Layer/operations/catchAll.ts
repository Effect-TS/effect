import { Managed } from "../../Managed"
import type { Layer } from "../definition"
import { foldLayer_ } from "./foldLayer"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Layer catchAll
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  handler: (e: E) => Layer<R2, E2, A2>
): Layer<R & R2, E2, A | A2> {
  return foldLayer_(self, handler, (a) => fromRawManaged(Managed.succeedNow(a)))
}

/**
 * Recovers from all errors.
 */
export function catchAll<E, R2, E2, A2>(handler: (e: E) => Layer<R2, E2, A2>) {
  return <R, A>(self: Layer<R, E, A>): Layer<R & R2, E2, A | A2> =>
    self.catchAll(handler)
}
