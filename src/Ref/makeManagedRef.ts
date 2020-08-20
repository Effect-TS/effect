import { toManaged } from "../Effect/toManaged"
import { pipe } from "../Function"
import { makeRef } from "./api"

/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManagedRef = <A>(a: A) => pipe(makeRef(a), toManaged())
