import { currentReleaseMap } from "../../FiberRef/definition/data"
import { locally_ } from "../../FiberRef/operations/locally"
import { pipe } from "../../Function"
import { await as awaitPromise } from "../../Promise/operations/await"
import { make as makePromise } from "../../Promise/operations/make"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"
import { mapEffect_ } from "./mapEffect"
import { releaseMap } from "./releaseMap"

/**
 * Returns a memoized version of the specified managed.
 */
export function memoize_<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<unknown, never, Managed<R, E, A>> {
  return mapEffect_(
    releaseMap,
    (finalizers) =>
      pipe(
        T.do,
        T.bind("promise", () => makePromise<E, A>()),
        T.bind("complete", ({ promise }) =>
          pipe(
            locally_(currentReleaseMap.value, finalizers)(self.effect),
            T.map((_) => _.get(1)),
            T.intoPromise(promise),
            T.once
          )
        ),
        T.map(({ complete, promise }) =>
          fromEffect(T.chain_(complete, () => awaitPromise(promise)))
        )
      ),
    __trace
  )
}
