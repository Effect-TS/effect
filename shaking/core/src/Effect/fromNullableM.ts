import { Option, fromNullable } from "fp-ts/lib/Option"

import { Effect } from "../Support/Common/effect"

import { map_ } from "./map"

export function fromNullableM<S, R, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R, E, Option<NonNullable<A>>> {
  return map_(ma, fromNullable)
}
