import type { List } from "./common"
import { cons } from "./cons"
import { foldr } from "./foldr"

export function concat<A>(front: List<A>, back: List<A>): List<A> {
  return foldr(front, back, cons)
}
