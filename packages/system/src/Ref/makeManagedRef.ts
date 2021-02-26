import { toManaged } from "../Effect/toManaged"
import { pipe } from "../Function"
import type { Managed } from "../Managed/managed"
import { makeRef } from "./api"
import type { Ref } from "./XRef"

/**
 * Creates a new `XRef` with the specified value.
 */
export const makeManagedRef: <A>(a: A) => Managed<unknown, never, Ref<A>> = (x) =>
  pipe(x, makeRef, toManaged())
