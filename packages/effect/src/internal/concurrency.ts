import type { Effect } from "../Effect.js"
import type { Concurrency } from "../Types.js"
import * as core from "./core.js"

/** @internal */
export const match = <R, E, A>(
  concurrency: Concurrency | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  bounded: (limit: number) => Effect<R, E, A>
): Effect<R, E, A> => {
  switch (concurrency) {
    case undefined:
      return sequential()
    case "unbounded":
      return unbounded()
    case "inherit":
      return core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency === "unbounded" ?
            unbounded() :
            concurrency > 1 ?
            bounded(concurrency) :
            sequential()
      )
    default:
      return concurrency > 1 ? bounded(concurrency) : sequential()
  }
}

/** @internal */
export const matchSimple = <R, E, A>(
  concurrency: Concurrency | undefined,
  sequential: () => Effect<R, E, A>,
  concurrent: () => Effect<R, E, A>
): Effect<R, E, A> => {
  switch (concurrency) {
    case undefined:
      return sequential()
    case "unbounded":
      return concurrent()
    case "inherit":
      return core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency === "unbounded" || concurrency > 1 ?
            concurrent() :
            sequential()
      )
    default:
      return concurrency > 1 ? concurrent() : sequential()
  }
}
