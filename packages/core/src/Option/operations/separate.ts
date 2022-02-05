// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Either } from "../../Either/index.js"

const defaultSeparate = Tp.tuple(O.none, O.none)

export function separate<A, B>(
  ma: O.Option<Either<A, B>>
): Tp.Tuple<[O.Option<A>, O.Option<B>]> {
  const o = O.map_(ma, (e) => Tp.tuple(O.getLeft(e), O.getRight(e)))
  return O.isNone(o) ? defaultSeparate : o.value
}
