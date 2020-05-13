import type { List, Nil } from "./common"

export function isNil<A>(list: List<A>): list is Nil {
  return list._tag === "nil"
}
