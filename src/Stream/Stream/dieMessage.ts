import { dieMessage as _ } from "../../Effect/dieMessage"
import { fromEffect } from "./fromEffect"

/**
 * The stream that dies with an exception described by `msg`.
 */
export function dieMessage(msg: string) {
  fromEffect(_(msg))
}
