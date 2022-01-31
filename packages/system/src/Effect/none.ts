// ets_tracing: off

import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { UIO } from "./effect.js"

/**
 * Returns an effect with the empty value.
 */
export const none: UIO<O.Option<never>> = succeed(O.none)
