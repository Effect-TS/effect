import type { Lazy } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { flatten } from "./chain"
import { trySync } from "./trySync"

export function tryEffect<S, R, E, A>(
  thunk: Lazy<Effect<S, R, E, A>>
): Effect<S, R, unknown, A> {
  return flatten(trySync(thunk))
}
