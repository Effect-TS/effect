import * as O from "../Option"
import { succeed } from "./core"
import type { Sync } from "./effect"

/**
 * Returns an effect with the empty value.
 */
export const none: Sync<O.Option<never>> = succeed(O.none)
