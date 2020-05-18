/* eslint-disable prefer-spread */

export function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = acc.concat([x])
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}
