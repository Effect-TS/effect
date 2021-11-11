// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Either } from "../../Either"
import type { Separated } from "../../Utils"

const defaultSeparate = { left: O.none, right: O.none }

export function separate<A, B>(
  ma: O.Option<Either<A, B>>
): Separated<O.Option<A>, O.Option<B>> {
  const o = O.map_(ma, (e) => ({
    left: O.getLeft(e),
    right: O.getRight(e)
  }))
  return O.isNone(o) ? defaultSeparate : o.value
}
