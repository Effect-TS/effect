import type { List } from "./common"
import { concat } from "./concat"
import { foldl_ } from "./foldl_"
import { nil } from "./nil"

export function flatten<A>(list: List<List<A>>): List<A> {
  return foldl_(list, nil as List<A>, concat)
}
