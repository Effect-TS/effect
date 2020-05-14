export const chain: <A, B>(f: (a: A) => B) => (ma: A) => B = (f) => (ma) => f(ma)
