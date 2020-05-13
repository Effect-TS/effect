import type { List } from "./common"
import { cons } from "./cons"
import { foldr } from "./foldr"
import { of } from "./of"

export function snoc<A>(append: A, list: List<A>): List<A> {
  return foldr(list, of(append), cons)
}
