import * as T from "../_internal/effect"
import type { RIO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * Accesses the whole environment of the stream.
 */
export function environment<R>(): RIO<R, R> {
  return fromEffect(T.environment<R>())
}
