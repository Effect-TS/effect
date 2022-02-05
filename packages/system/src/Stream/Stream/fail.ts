// ets_tracing: off

import * as T from "../_internal/effect.js"
import type { IO } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"

/**
 * The stream that always fails with the error
 */
export function fail<E>(e: E): IO<E, never> {
  return fromEffect(T.fail(e))
}
