// tracing: off

import "../Operator"

import * as A from "../Array"
import type { Either } from "../Either"
import { identity } from "../Function"
import type { Separated } from "../Utils"

function* genOf<A>(a: A) {
  yield a
}

function* genMap<A, B>(iterator: Iterator<A>, mapping: (a: A, i: number) => B) {
  let n = -1
  while (true) {
    const result = iterator.next()
    if (result.done) {
      break
    }
    n += 1
    yield mapping(result.value, n)
  }
}

function* genConcat<A>(iteratorA: Iterator<A>, iteratorB: Iterator<A>) {
  while (true) {
    const result = iteratorA.next()
    if (result.done) {
      break
    }
    yield result.value
  }
  while (true) {
    const result = iteratorB.next()
    if (result.done) {
      break
    }
    yield result.value
  }
}

function* genChain<A, B>(iterator: Iterator<A>, mapping: (a: A) => Iterable<B>) {
  while (true) {
    const result = iterator.next()
    if (result.done) {
      break
    }
    const ib = mapping(result.value)[Symbol.iterator]()
    while (true) {
      const result = ib.next()
      if (result.done) {
        break
      }
      yield result.value
    }
  }
}

// inspired from "Closing Iterables is a Leaky Abstraction" by Reginald Braithwaite
// https://raganwald.com/2017/07/22/closing-iterables-is-a-leaky-abstraction.html
export function zipWith<A, B, C>(
  iterableA: Iterable<A>,
  iterableB: Iterable<B>,
  zipper: (a: A, b: B) => C
): Iterable<C> {
  return {
    [Symbol.iterator]() {
      let done = false
      const ia = iterableA[Symbol.iterator]()
      const ib = iterableB[Symbol.iterator]()
      return {
        next() {
          if (done) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.return!()
          }

          const va = ia.next()
          const vb = ib.next()

          return va.done || vb.done
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.return!()
            : { done: false, value: zipper(va.value, vb.value) }
        },
        return(value?: unknown) {
          if (!done) {
            done = true

            if (typeof ia.return === "function") {
              ia.return()
            }
            if (typeof ib.return === "function") {
              ib.return()
            }
          }

          return { done: true, value }
        }
      }
    }
  }
}

export function map<A, B>(f: (a: A, k: number) => B) {
  return (i: Iterable<A>): Iterable<B> => ({
    [Symbol.iterator]: () => genMap(i[Symbol.iterator](), f)
  })
}

export function map_<A, B>(i: Iterable<A>, f: (a: A, k: number) => B): Iterable<B> {
  return {
    [Symbol.iterator]: () => genMap(i[Symbol.iterator](), f)
  }
}

export function zip<B>(fb: Iterable<B>) {
  return <A>(fa: Iterable<A>): Iterable<readonly [A, B]> =>
    zipWith(fa, fb, (a, b) => [a, b] as const)
}

export function zip_<A, B>(
  fa: Iterable<A>,
  fb: Iterable<B>
): Iterable<readonly [A, B]> {
  return zipWith(fa, fb, (a, b) => [a, b] as const)
}

export function chain<A, B>(f: (a: A) => Iterable<B>) {
  return (i: Iterable<A>): Iterable<B> => ({
    [Symbol.iterator]: () => genChain(i[Symbol.iterator](), f)
  })
}

export function chain_<A, B>(i: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return {
    [Symbol.iterator]: () => genChain(i[Symbol.iterator](), f)
  }
}

export function ap<A>(fa: Iterable<A>) {
  return <B>(fab: Iterable<(a: A) => B>): Iterable<B> => chain_(fab, (f) => map_(fa, f))
}

export function of<A>(a: A): Iterable<A> {
  return {
    [Symbol.iterator]: () => genOf(a)
  }
}

export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
}

export function foldMap<M>(M: { empty: M; concat: (x: M, y: M) => M }) {
  return <A>(f: (a: A, k: number) => M) => (fa: Iterable<A>): M => {
    let res = M.empty
    let n = -1
    const iterator = fa[Symbol.iterator]()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = iterator.next()
      if (result.done) {
        break
      }
      n += 1
      res = M.concat(res, f(result.value, n))
    }
    return res
  }
}

export function reduce<A, B>(b: B, f: (b: B, a: A, i: number) => B) {
  return (fa: Iterable<A>): B => reduce_(fa, b, f)
}

export function reduce_<A, B>(
  fa: Iterable<A>,
  b: B,
  f: (b: B, a: A, i: number) => B
): B {
  let res = b
  let n = -1
  const iterator = fa[Symbol.iterator]()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = iterator.next()
    if (result.done) {
      break
    }
    n += 1
    res = f(res, result.value, n)
  }
  return res
}

export function reduceRight<A, B>(b: B, f: (a: A, b: B, i: number) => B) {
  return (fa: Iterable<A>): B => {
    return A.reduceRightWithIndex_(Array.from(fa), b, (i, a, b) => f(a, b, i))
  }
}

export function reduceRight_<A, B>(
  fa: Iterable<A>,
  b: B,
  f: (a: A, b: B, i: number) => B
): B {
  return A.reduceRightWithIndex_(Array.from(fa), b, (i, a, b) => f(a, b, i))
}

export function concat<A>(a: Iterable<A>, b: Iterable<A>): Iterable<A> {
  return {
    [Symbol.iterator]: () => genConcat(a[Symbol.iterator](), b[Symbol.iterator]())
  }
}

export function flatten<A>(a: Iterable<Iterable<A>>) {
  return chain_(a, identity)
}

export function partitionMap<A, A1, A2>(f: (a: A) => Either<A1, A2>) {
  return (as: Iterable<A>): Separated<Iterable<A1>, Iterable<A2>> =>
    A.separate(Array.from(map_(as, f)))
}
