import type { List } from "./common"

export function cons<A>(h: A, t: List<A>): List<A> {
  return {
    _tag: "cons",
    head: h,
    tail: t
  }
}
