// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { Ord } from "../../Ord/index.js"
import { makeOrd } from "../../Ord/index.js"

/**
 * The `Ord` instance allows `Option` values to be compared with
 * `compare`, whenever there is an `Ord` instance for
 * the type the `Option` contains.
 *
 * `None` is considered to be less than any `Some` value.
 */
export function getOrd<A>(_: Ord<A>): Ord<O.Option<A>> {
  return makeOrd((x, y) =>
    x === y ? 0 : O.isSome(x) ? (O.isSome(y) ? _.compare(x.value, y.value) : 1) : -1
  )
}
