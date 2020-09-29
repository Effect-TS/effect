import * as O from "../Option"
import { succeed } from "./core"
import type { UIO } from "./effect"

/**
 * Returns an effect with the empty value.
 */
export const none: UIO<O.Option<never>> = succeed(O.none)
