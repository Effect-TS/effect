// ets_tracing: off

import { environmentWith } from "../../Effect/operations/environmentWith"
import type { Layer } from "../definition/base"
import { fromRawEffect } from "./fromRawEffect"

/**
 * Creates a layer from a function
 */
export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return fromRawEffect(environmentWith(f))
}
