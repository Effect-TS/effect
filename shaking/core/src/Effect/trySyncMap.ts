import { Lazy } from "fp-ts/lib/function"

import { SyncE } from "../Support/Common/effect"

import { pure } from "./pure"
import { raiseError } from "./raiseError"
import { suspended } from "./suspended"

export function trySyncMap<E>(
  onError: (e: unknown) => E
): <A = unknown>(thunk: Lazy<A>) => SyncE<E, A> {
  return (thunk) =>
    suspended(() => {
      try {
        return pure(thunk())
      } catch (e) {
        return raiseError(onError(e))
      }
    })
}
