import type { List } from "./common"
import { cons } from "./cons"
import { foldl_ } from "./foldl_"
import { nil } from "./nil"

export function reverse<A>(list: List<A>): List<A> {
  return foldl_(list, nil as List<A>, (t, h) => cons(h, t))
}
