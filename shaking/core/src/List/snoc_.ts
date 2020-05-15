import type { List } from "./common"
import { cons } from "./cons"
import { foldr_ } from "./foldr_"
import { of } from "./of"

export function snoc_<A>(append: A, list: List<A>): List<A> {
  return foldr_(list, of(append), cons)
}
