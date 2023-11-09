/** @internal */
export function concat<B>(that: Iterable<B>) {
  return <A>(self: Iterable<A>): Iterable<A | B> => {
    return {
      [Symbol.iterator]() {
        const iterA = self[Symbol.iterator]()
        let doneA = false
        let iterB: Iterator<B>
        return {
          next() {
            if (!doneA) {
              const r = iterA.next()
              if (r.done) {
                doneA = true
                iterB = that[Symbol.iterator]()
                return iterB.next()
              }
              return r
            }
            return iterB.next()
          }
        }
      }
    }
  }
}

/** @internal */
export function reduce<A, B>(b: B, f: (s: B, a: A) => B) {
  return function(iterable: Iterable<A>): B {
    if (Array.isArray(iterable)) {
      return iterable.reduce(f, b)
    }
    let result = b
    for (const n of iterable) {
      result = f(result, n)
    }
    return result
  }
}

/** @internal */
export function map<A, B>(f: (a: A) => B) {
  return function(iterable: Iterable<A>): Iterable<B> {
    if (Array.isArray(iterable)) {
      return iterable.map(f)
    }
    return (function*() {
      for (const n of iterable) {
        yield f(n)
      }
    })()
  }
}
