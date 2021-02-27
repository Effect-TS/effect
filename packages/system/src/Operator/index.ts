declare global {
  interface Object {
    /**
     * To be used like
     * ```ts
     * T.succeed(1)["|>"](T.map(n => n + 1))["|>"](T.map(n => n + 2))
     * ```
     */
    ["|>"]<Self, Result>(this: Self, next: (value: Self) => Result): Result
  }
}

let patched = false

export function patch() {
  if (patched || Object.prototype["|>"]) {
    return
  }

  Object.defineProperty(Object.prototype, "|>", {
    value<Self, Result>(this: Self, next: (value: Self) => Result): Result {
      return next(this)
    },
    enumerable: false
  })

  patched = true
}

patch()

export {}
