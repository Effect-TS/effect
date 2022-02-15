import { Effect } from "../../Effect/definition/base"
import { Layer } from "../definition"

/**
 * Creates a layer from an effectful function
 */
export function fromRawFunctionEffect<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): Layer<R & A, E, B> {
  return Layer.fromRawEffect(Effect.environmentWithEffect(f))
}
