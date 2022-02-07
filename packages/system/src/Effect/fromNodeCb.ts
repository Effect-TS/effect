// ets_tracing: off

import { succeed } from "./core.js"
import type { IO } from "./effect.js"
import { effectAsync } from "./effectAsync.js"
import { fail } from "./fail.js"

export function fromNodeCb<L, R>(
  f: (this: unknown, cb: (e: L | null | undefined, r?: R) => void) => void,
  __trace?: string
): () => IO<L, R>
export function fromNodeCb<A, L, R>(
  f: (this: unknown, a: A, cb: (e: L | null | undefined, r?: R) => void) => void,
  __trace?: string
): (a: A) => IO<L, R>
export function fromNodeCb<A, B, L, R>(
  f: (this: unknown, a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void,
  __trace?: string
): (a: A, b: B) => IO<L, R>
export function fromNodeCb<A, B, C, L, R>(
  f: (
    this: unknown,
    a: A,
    b: B,
    c: C,
    cb: (e: L | null | undefined, r?: R) => void
  ) => void,
  __trace?: string
): (a: A, b: B, c: C) => IO<L, R>
export function fromNodeCb<A, B, C, D, L, R>(
  f: (
    this: unknown,
    a: A,
    b: B,
    c: C,
    d: D,
    cb: (e: L | null | undefined, r?: R) => void
  ) => void,
  __trace?: string
): (a: A, b: B, c: C, d: D) => IO<L, R>
export function fromNodeCb<A, B, C, D, E, L, R>(
  f: (
    this: unknown,
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    cb: (e: L | null | undefined, r?: R) => void
  ) => void,
  __trace?: string
): (a: A, b: B, c: C, d: D, e: E) => IO<L, R>
export function fromNodeCb<A extends any[], L, R>(
  f: (this: unknown, ...args: [...A, (e: L | null | undefined, r?: R) => void]) => void,
  __trace?: string
): (...args: A) => IO<L, R>
export function fromNodeCb<L, R>(f: Function, __trace?: string): () => IO<L, R> {
  return function () {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments)

    return effectAsync<unknown, L, R>((cb) => {
      const cbResolver = (e: L, r: R) => (e != null ? cb(fail(e)) : cb(succeed(r)))

      // eslint-disable-next-line prefer-spread
      f.apply(null, args.concat(cbResolver))
    }, __trace)
  }
}
