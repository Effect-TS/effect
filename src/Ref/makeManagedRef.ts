import { toManaged } from "../Effect/toManaged"
import { flow } from "../Function"
import { makeRef } from "./api"

/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManagedRef = flow(makeRef, toManaged())
