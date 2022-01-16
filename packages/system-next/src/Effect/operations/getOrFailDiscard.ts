// ets_tracing: off

import { constVoid } from "../../Function"
import type * as O from "../../Option"
import type { IO } from "../definition"
import { getOrFailWith_ } from "./getOrFailWith"

/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 */
export function getOrFailUnit<A>(v: O.Option<A>, __trace?: string): IO<void, A> {
  return getOrFailWith_(v, constVoid, __trace)
}
