import type { Either } from "./Either"

export function tailRec<A, B>(a: A, f: (a: A) => Either<A, B>): B {
  let v = f(a)
  while (v._tag === "Left") {
    v = f(v.left)
  }
  return v.right
}
