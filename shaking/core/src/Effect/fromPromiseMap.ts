import { left, right } from "fp-ts/lib/Either"
import { Lazy } from "fp-ts/lib/function"

import { AsyncE } from "../Support/Common/effect"

import { async } from "./async"

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
