import * as E from "../Either"
import { pipe } from "../Function"
import type * as O from "../Option"
import { fromEither } from "./core"

export function fromOptionWith_<A, E>(
  ma: O.Option<A>,
  onNone: () => E,
  __trace?: string
) {
  return pipe(E.fromOption_(ma, onNone), fromEither)
}

export const fromOptionWith =
  <A, E>(onNone: () => E) =>
  (ma: O.Option<A>) =>
    fromOptionWith_(ma, onNone)
