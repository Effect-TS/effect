import { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Layer catchAll
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  handler: (e: E) => Layer<R2, E2, A2>
): Layer<R & R2, E2, A | A2> {
  return self.foldLayer(handler, (a) => Layer.fromRawEffect(Effect.succeedNow(a)))
}

/**
 * Recovers from all errors.
 */
export const catchAll = Pipeable(catchAll_)
