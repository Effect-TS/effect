import { left, right } from "fp-ts/lib/Either"
import { Lazy } from "fp-ts/lib/function"

import { AsyncE } from "../Support/Common/effect"

import { async } from "./async"
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
