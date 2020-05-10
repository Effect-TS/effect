import type { Separated } from "fp-ts/lib/Compactable"
import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { defaultSeparate } from "./common"
import { getLeft } from "./getLeft"
import { getRight } from "./getRight"
import { isNone } from "./isNone"
import { map_ } from "./map_"

export const separate = <A, B>(
  ma: Option<Either<A, B>>
): Separated<Option<A>, Option<B>> => {
  const o = map_(ma, (e) => ({
    left: getLeft(e),
    right: getRight(e)
  }))
  return isNone(o) ? defaultSeparate : o.value
}
