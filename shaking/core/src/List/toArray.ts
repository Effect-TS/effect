import type { List } from "./common"
import { isCons } from "./isCons"

export function toArray<A>(as: List<A>): A[] {
  const out: A[] = []
  let iter = as
  while (isCons(iter)) {
    out.push(iter.head)
    iter = iter.tail
  }
  return out
}
