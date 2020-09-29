import { environment as _ } from "../../Effect/environment"
import type { RIO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * Accesses the whole environment of the stream.
 */
export const environment = <R>(): RIO<R, R> => fromEffect(_<R>())
