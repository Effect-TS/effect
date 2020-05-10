import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"
import type { Runtime } from "../Support/Runtime"

import { accessRuntime } from "./accessRuntime"
import { chain_ } from "./chain"

/**
 * Access the runtime then provide it to the provided function
 * @param f
 */

export function withRuntime<S, R, E, A>(
  f: FunctionN<[Runtime], Effect<S, R, E, A>>
): Effect<S, R, E, A> {
  return chain_(accessRuntime, f)
}
