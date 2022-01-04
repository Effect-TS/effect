// ets_tracing: off

import type { Exit } from "../definition"
import { Success } from "../definition"

export function succeed<A>(a: A): Exit<never, A> {
  return new Success(a)
}
