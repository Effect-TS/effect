interface Object {
  pipe<T, R>(this: T, next: (value: T) => R): R
}

Object.prototype.pipe = function <T, R>(this: T, next: (value: T) => R): R {
  return next(this)
}
