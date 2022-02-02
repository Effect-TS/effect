// ets_tracing: off

import "../Operator/index.js"

import * as A from "../Collections/Immutable/Array/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { Either } from "../Either/index.js"
import { identity } from "../Function/index.js"

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
  return <A>(fa: Iterable<A>): Iterable<Tp.Tuple<[A, B]>> => zipWith(fa, fb, Tp.tuple)
}

export function zip_<A, B>(
  fa: Iterable<A>,
  fb: Iterable<B>
): Iterable<Tp.Tuple<[A, B]>> {
  return zipWith(fa, fb, Tp.tuple)
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

export function take_<A>(a: Iterable<A>, n: number): Iterable<A> {
  return {
    *[Symbol.iterator]() {
      let i = 0
      for (const x of a) {
        if (i++ >= n) {
          return
        }
        yield x
      }
    }
  }
}

export function skip_<A>(a: Iterable<A>, n: number): Iterable<A> {
  return {
    *[Symbol.iterator]() {
      let i = 0
      for (const x of a) {
        if (i++ >= n) {
          yield x
        }
      }
    }
  }
}

export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
}

export function foldMap<M>(M: { empty: M; concat: (x: M, y: M) => M }) {
  return <A>(f: (a: A, k: number) => M) =>
    (fa: Iterable<A>): M => {
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
    *[Symbol.iterator]() {
      for (const x of a) {
        yield x
      }
      for (const x of b) {
        yield x
      }
    }
  }
}

export function flatten<A>(a: Iterable<Iterable<A>>) {
  return chain_(a, identity)
}

export function partitionMap<A, A1, A2>(f: (a: A) => Either<A1, A2>) {
  return (as: Iterable<A>): Tp.Tuple<[Iterable<A1>, Iterable<A2>]> =>
    A.separate(Array.from(map_(as, f)))
}

/**
 * Infinite sequence produced by repeated application of f to a
 */
export function unfold<A>(a: A, f: (a: A) => A): Iterable<A> {
  return {
    *[Symbol.iterator]() {
      yield a
      let current = a
      while (true) {
        current = f(a)
        yield current
      }
    }
  }
}

export function corresponds<A, B>(
  left: Iterable<A>,
  right: Iterable<B>,
  f: (a: A, b: B) => boolean
) {
  const leftIt = left[Symbol.iterator]()
  const rightIt = right[Symbol.iterator]()
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const lnext = leftIt.next()
    const rnext = rightIt.next()
    if (lnext.done !== rnext.done) {
      return false
    }
    if (lnext.done) {
      return true
    }
    if (!f(lnext.value, rnext.value)) {
      return false
    }
  }
  throw new Error("Bug")
}
