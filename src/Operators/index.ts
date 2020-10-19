interface Object {
  ["|>"]<Self, Result>(this: Self, next: (value: Self) => Result): Result
}

Object.prototype["|>"] = function <Self, Result>(
  this: Self,
  next: (value: Self) => Result
): Result {
  return next(this)
}
