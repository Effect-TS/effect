import type { Effect } from "../Effect"
import type { Concurrency } from "../Types"
import * as core from "./core"

/** @internal */
export const match: <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  bounded: (limit: number) => Effect<R, E, A>
) => Effect<R, E, A> = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  unbounded: () => Effect<R, E, A>,
  bounded: (limit: number) => Effect<R, E, A>
) => {
  switch (options?.concurrency) {
    case undefined: {
      return sequential()
    }
    case "unbounded": {
      return unbounded()
    }
    case "inherit": {
      return core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency === "unbounded" ?
            unbounded() :
            concurrency > 1 ?
            bounded(concurrency) :
            sequential()
      )
    }
    default: {
      return options!.concurrency > 1 ?
        bounded(options!.concurrency) :
        sequential()
    }
  }
}

/** @internal */
export const matchSimple: <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  concurrent: () => Effect<R, E, A>
) => Effect<R, E, A> = <R, E, A>(
  options: {
    readonly concurrency?: Concurrency
  } | undefined,
  sequential: () => Effect<R, E, A>,
  concurrent: () => Effect<R, E, A>
) => {
  switch (options?.concurrency) {
    case undefined: {
      return sequential()
    }
    case "unbounded": {
      return concurrent()
    }
    case "inherit": {
      return core.fiberRefGetWith(
        core.currentConcurrency,
        (concurrency) =>
          concurrency === "unbounded" ?
            concurrent() :
            concurrency > 1 ?
            concurrent() :
            sequential()
      )
    }
    default: {
      return options!.concurrency > 1 ? concurrent() : sequential()
    }
  }
}
