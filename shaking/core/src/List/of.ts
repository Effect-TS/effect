import type { List } from "./common"
import { cons } from "./cons"
import { nil } from "./nil"

export function of<A>(a: A): List<A> {
  return cons(a, nil)
}
