import { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Creates a layer from a function.
 *
 * @tsplus static ets/LayerOps fromRawFunction
 */
export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return Layer.fromRawEffect(Effect.environmentWith(f))
}
