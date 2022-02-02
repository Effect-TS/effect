// ets_tracing: off

import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import type * as C from "../core"
import * as MapEffect from "./mapEffect"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export function absolve<R, E, E2, A>(
  xs: C.Stream<R, E, E.Either<E2, A>>
): C.Stream<R, E | E2, A> {
  return MapEffect.mapEffect_(xs, (_) => T.fromEither(() => _))
}
