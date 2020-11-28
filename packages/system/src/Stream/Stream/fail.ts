import * as T from "../_internal/effect"
import type { IO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that always fails with the error
 */
export function fail<E>(e: E): IO<E, never> {
  return fromEffect(T.fail(e))
}
