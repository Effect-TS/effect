import * as T from "../_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * The stream that dies with an exception described by `msg`.
 */
export function dieMessage(msg: string) {
  fromEffect(T.dieMessage(msg))
}
