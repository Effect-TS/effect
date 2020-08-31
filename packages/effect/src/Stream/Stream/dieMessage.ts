import { dieMessage as _ } from "../../Effect/dieMessage"
import { fromEffect } from "./fromEffect"

/**
 * The stream that dies with an exception described by `msg`.
 */
export const dieMessage = (msg: string) => fromEffect(_(msg))
