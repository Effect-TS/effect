// ets_tracing: off

import type { UIO } from "../Effect/primitives"
import type { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Reads the value associated with the current fiber. Returns initial value if
 * no value was `set` or inherited from parent.
 */
export const get: <A>(fiberRef: FiberRef<A>) => UIO<A> = modify((a) => [a, a])
