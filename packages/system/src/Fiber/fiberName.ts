// ets_tracing: off

import { Runtime } from "../FiberRef/index.js"
import { identity } from "../Function/index.js"
import * as O from "../Option/index.js"

/**
 * A `FiberRef` that stores the name of the fiber, which defaults to `None`.
 */
export const fiberName = new Runtime<O.Option<string>>(O.none, identity, identity)
