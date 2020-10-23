import { succeed } from "./core"
import type { IO } from "./effect"
import { effectAsync } from "./effectAsync"

export function fromNodeCb<L, R>(
  f: (cb: (e: L | null | undefined, r?: R) => void) => void
): () => IO<L, R>
export function fromNodeCb<A, L, R>(
  f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A) => IO<L, R>
export function fromNodeCb<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => IO<L, R>
export function fromNodeCb<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => IO<L, R>
export function fromNodeCb<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => IO<L, R>
export function fromNodeCb<A, B, C, D, E, L, R>(
  f: (
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    cb: (e: L | null | undefined, r?: R) => void
  ) => void
): (a: A, b: B, c: C, d: D, e: E) => IO<L, R>
export function fromNodeCb<L, R>(f: Function): () => IO<L, R> {
  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments)

    return effectAsync<unknown, L, R>((cb) => {
      const cbResolver = (e: L, r: R) => (e != null ? cb(fail(e)) : cb(succeed(r)))

      // eslint-disable-next-line prefer-spread
      f.apply(null, args.concat(cbResolver))
    })
  }
}
