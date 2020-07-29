import * as A from "../../Array"
import { identity } from "../../Function"
import { Monoid } from "../../Monoid"

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

export const map = <A, B>(f: (a: A, k: number) => B) => (
  i: Iterable<A>
): Iterable<B> => ({
  [Symbol.iterator]: () => genMap(i[Symbol.iterator](), f)
})

export const map_ = <A, B>(i: Iterable<A>, f: (a: A, k: number) => B): Iterable<B> => ({
  [Symbol.iterator]: () => genMap(i[Symbol.iterator](), f)
})

export const chain = <A, B>(f: (a: A) => Iterable<B>) => (
  i: Iterable<A>
): Iterable<B> => ({
  [Symbol.iterator]: () => genChain(i[Symbol.iterator](), f)
})

export const chain_ = <A, B>(
  i: Iterable<A>,
  f: (a: A) => Iterable<B>
): Iterable<B> => ({
  [Symbol.iterator]: () => genChain(i[Symbol.iterator](), f)
})

export const ap: <A>(
  fa: Iterable<A>
) => <B>(fab: Iterable<(a: A) => B>) => Iterable<B> = (fa) => (fab) =>
  chain_(fab, (f) => map_(fa, f))

export const of = <A>(a: A): Iterable<A> => ({
  [Symbol.iterator]: () => genOf(a)
})

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A, k: number) => M) => (
  fa: Iterable<A>
): M => {
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

export const reduce = <A, B>(b: B, f: (b: B, a: A, i: number) => B) => (
  fa: Iterable<A>
): B => reduce_(fa, b, f)

export const reduce_ = <A, B>(
  fa: Iterable<A>,
  b: B,
  f: (b: B, a: A, i: number) => B
): B => {
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

export const reduceRight = <A, B>(b: B, f: (a: A, b: B, i: number) => B) => (
  fa: Iterable<A>
): B => {
  return A.reduceRightWithIndex_(Array.from(fa), b, (i, a, b) => f(a, b, i))
}

export const reduceRight_ = <A, B>(
  fa: Iterable<A>,
  b: B,
  f: (a: A, b: B, i: number) => B
): B => {
  return A.reduceRightWithIndex_(Array.from(fa), b, (i, a, b) => f(a, b, i))
}

export const concat = <A>(a: Iterable<A>, b: Iterable<A>): Iterable<A> => ({
  [Symbol.iterator]: () => genConcat(a[Symbol.iterator](), b[Symbol.iterator]())
})

export const flatten = <A>(a: Iterable<Iterable<A>>) => chain_(a, identity)
