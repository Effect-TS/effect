export const reduceRight_: <A, B>(fa: A, b: B, f: (a: A, b: B) => B) => B = (
  fa,
  b,
  f
) => f(fa, b)
