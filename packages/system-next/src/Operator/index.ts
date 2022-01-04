// ets_tracing: off

declare global {
  interface Object {
    /**
     * To be used like
     * ```ts
     * T.succeed(1)["|>"](T.map(n => n + 1))["|>"](T.map(n => n + 2))
     * ```
     *
     * @ets_optimize operator
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
    enumerable: false,
    writable: true
  })

  patched = true
}

patch()

export {}
