import type { List } from "./common"
import { cons } from "./cons"
import { nil } from "./nil"

export function fromArray<A>(as: readonly A[]): List<A> {
  return as.reduceRight((t, h) => cons(h, t), nil as List<A>)
}
