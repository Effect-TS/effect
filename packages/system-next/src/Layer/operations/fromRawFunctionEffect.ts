// ets_tracing: off

import type { Effect } from "../../Effect/definition/base"
import { environmentWithEffect } from "../../Effect/operations/environmentWithEffect"
import type { Layer } from "../definition/base"
import { fromRawEffect } from "./fromRawEffect"

/**
 * Creates a layer from an effectful function
 */
export function fromRawFunctionEffect<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): Layer<R & A, E, B> {
  return fromRawEffect(environmentWithEffect(f))
}
