import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Constructs a layer that fails with the specified cause.
 *
 * @tsplus static ets/LayerOps failCause
 */
export function failCause<E>(cause: LazyArg<Cause<E>>): Layer<unknown, E, never> {
  return Layer.fromRawEffect(Effect.failCause(cause))
}
