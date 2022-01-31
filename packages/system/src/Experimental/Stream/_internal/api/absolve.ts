// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import type * as C from "../core.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export function absolve<R, E, E2, A>(
  xs: C.Stream<R, E, E.Either<E2, A>>
): C.Stream<R, E | E2, A> {
  return MapEffect.mapEffect_(xs, (_) => T.fromEither(() => _))
}
