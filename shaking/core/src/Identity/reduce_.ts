export const reduce_: <A, B>(fa: A, b: B, f: (b: B, a: A) => B) => B = (fa, b, f) =>
  f(b, fa)
