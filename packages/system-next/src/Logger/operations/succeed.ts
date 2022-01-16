// ets_tracing: off

import type { Logger } from "../definition"
import { simple } from "./simple"

export function succeed<A>(a: A): Logger<any, A> {
  return simple(() => a)
}
