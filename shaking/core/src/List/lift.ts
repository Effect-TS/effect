import type { FunctionN } from "../Function"

import type { List } from "./common"
import { map } from "./map"

export function lift<A, B>(f: FunctionN<[A], B>): FunctionN<[List<A>], List<B>> {
  return (list) => map(list, f)
}
