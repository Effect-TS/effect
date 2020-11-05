import { squash } from "../../Cause"
import { fail } from "../core"
import type { Managed } from "../managed"
import { succeed } from "../succeed"
import { foldM_ } from "./foldM_"
import { sandbox } from "./sandbox"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorb<E>(f: (e: E) => unknown) {
  return <R, A>(self: Managed<R, E, A>) =>
    foldM_(sandbox(self), (c) => fail(squash(f)(c)), succeed)
}
