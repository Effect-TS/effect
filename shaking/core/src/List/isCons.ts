import type { Cons, List } from "./common"

export function isCons<A>(list: List<A>): list is Cons<A> {
  return list._tag === "cons"
}
