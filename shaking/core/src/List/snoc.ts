import { List } from "./common"
import { cons } from "./cons"
import { foldr_ } from "./foldr_"
import { of } from "./of"

export function snoc<A>(append: A): (list: List<A>) => List<A> {
  return (list) => foldr_(list, of(append), cons)
}
