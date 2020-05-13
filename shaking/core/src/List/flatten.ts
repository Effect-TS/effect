import type { List } from "./common"
import { concat } from "./concat"
import { foldl } from "./foldl"
import { nil } from "./nil"

export function flatten<A>(list: List<List<A>>): List<A> {
  return foldl(list, nil as List<A>, concat)
}
