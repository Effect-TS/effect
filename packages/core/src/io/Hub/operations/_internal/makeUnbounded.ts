import type { AtomicHub } from "./AtomicHub"
import { UnboundedHub } from "./UnboundedHub"

export function makeUnbounded<A>(): AtomicHub<A> {
  return new UnboundedHub()
}
