import type { Applicative } from "fp-ts/lib/Applicative"
import type { Separated } from "fp-ts/lib/Compactable"
import type { Either } from "fp-ts/lib/Either"
import type { HKT } from "fp-ts/lib/HKT"
import type { Option, URI } from "fp-ts/lib/Option"
import type { Wilt1 } from "fp-ts/lib/Witherable"

import { getLeft } from "./getLeft"
import { getRight } from "./getRight"
import { isNone } from "./isNone"
import { map_ } from "./map_"
import { none } from "./none"

export const wilt: Wilt1<URI> = <F>(F: Applicative<F>) => <A, B, C>(
  fa: Option<A>,
  f: (a: A) => HKT<F, Either<B, C>>
): HKT<F, Separated<Option<B>, Option<C>>> => {
  const o = map_(fa, (a) =>
    F.map(f(a), (e) => ({
      left: getLeft(e),
      right: getRight(e)
    }))
  )
  return isNone(o)
    ? F.of({
        left: none,
        right: none
      })
    : o.value
}
