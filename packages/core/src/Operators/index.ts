interface Object {
  /**
   * To be used like
   * ```ts
   * T.succeed(1)["|>"](T.map(n => n + 1))["|>"](T.map(n => n + 2))
   * ```
   */
  ["|>"]<Self, Result>(this: Self, next: (value: Self) => Result): Result
}

Object.prototype["|>"] = function <Self, Result>(
  this: Self,
  next: (value: Self) => Result
): Result {
  return next(this)
}

interface Function {
  /**
   * This operator does not work with generic parameters
   */
  [">>"]<Args extends any[], A, Result>(
    this: (...args: Args) => A,
    next: (value: A) => Result
  ): (...args: Args) => Result
}

Function.prototype[">>"] = function <Args extends any[], A, Result>(
  this: (...args: Args) => A,
  next: (value: A) => Result
): (...args: Args) => Result {
  return (...args) => next(this(...args))
}
