import type { Lazy } from "../Function"
import type { AsyncE } from "../Support/Common/effect"

import { async } from "./async"
import { left, right } from "./lr"
import { uninterruptible } from "./uninterruptible"

/**
 * Create an IO from a Promise factory.
 * @param thunk
 */
export function fromPromise<A>(thunk: Lazy<Promise<A>>): AsyncE<unknown, A> {
  return uninterruptible(
    async<unknown, A>((callback) => {
      thunk()
        .then((v) => callback(right(v)))
        .catch((e) => callback(left(e)))
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
  )
}
