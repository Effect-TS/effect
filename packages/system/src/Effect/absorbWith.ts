import { squash } from "../Cause"
import { flow, pipe } from "../Function"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM } from "./foldM"
import { sandbox } from "./sandbox"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorbWith<E>(f: (e: E) => unknown) {
  return <S, R, A>(fa: Effect<S, R, E, A>): Effect<S, R, unknown, A> =>
    absorbWith_(fa, f)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorbWith_<S, R, A, E>(fa: Effect<S, R, E, A>, f: (e: E) => unknown) {
  return pipe(fa, sandbox, foldM(flow(squash(f), fail), succeed))
}
