import type { List } from "./common"
import { cons } from "./cons"
import { foldr_ } from "./foldr_"

export function concat<A>(front: List<A>, back: List<A>): List<A> {
  return foldr_(front, back, cons)
}
