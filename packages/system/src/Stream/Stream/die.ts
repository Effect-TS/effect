import * as T from "../_internal/effect"
import type { UIO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that dies with the error.
 */
export function die(e: unknown): UIO<never> {
  return fromEffect(T.die(e))
}
