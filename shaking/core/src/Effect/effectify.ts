import { AsyncE } from "../Support/Common/effect"

import { async } from "./async"
import { left, right } from "./lr"

export function effectify<L, R>(
  f: (cb: (e: L | null | undefined, r?: R) => void) => void
): () => AsyncE<L, R>
export function effectify<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => AsyncE<L, R>
export function effectify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => AsyncE<L, R>
export function effectify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => AsyncE<L, R>
export function effectify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => AsyncE<L, R>
export function effectify<A, B, C, D, E, L, R>(
  f: (
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    cb: (e: L | null | undefined, r?: R) => void
  ) => void
): (a: A, b: B, c: C, d: D, e: E) => AsyncE<L, R>
export function effectify<L, R>(f: Function): () => AsyncE<L, R> {
  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments)
    return async<L, R>((cb) => {
      const cbResolver = (e: L, r: R) =>
        // tslint:disable-next-line: triple-equals
        e != null ? cb(left(e)) : cb(right(r))
      // eslint-disable-next-line prefer-spread
      f.apply(null, args.concat(cbResolver))
      /* istanbul ignore next */
      return (cb) => {
        cb()
      }
    })
  }
}
