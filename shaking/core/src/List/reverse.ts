import type { List } from "./common"
import { cons } from "./cons"
import { foldl } from "./foldl"
import { nil } from "./nil"

export function reverse<A>(list: List<A>): List<A> {
  return foldl(list, nil as List<A>, (t, h) => cons(h, t))
}
