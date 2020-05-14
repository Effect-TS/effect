export const chain_: <A, B>(fa: A, f: (a: A) => B) => B = (ma, f) => f(ma)
