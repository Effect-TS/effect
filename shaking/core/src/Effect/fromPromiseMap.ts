import type { Lazy } from "../Function"
import type { AsyncE } from "../Support/Common/effect"

import { async } from "./async"
import { left, right } from "./lr"

export function fromPromiseMap<E>(
  onError: (e: unknown) => E
): <A>(thunk: Lazy<Promise<A>>) => AsyncE<E, A> {
  return <A>(thunk: Lazy<Promise<A>>) =>
    async<E, A>((callback) => {
      thunk()
        .then((v) => callback(right(v)))
        .catch((e) => callback(left(onError(e))))
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
}
